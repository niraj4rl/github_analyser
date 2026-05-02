from __future__ import annotations

import asyncio
import copy
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

from .config import Settings
from .github_client import GitHubClient, GitHubRateLimitError
from .hmm_engine import infer_hmm_state
from .nlp import classify_commit_message
from .scoring import determine_recommendation, predict_hire_score


ANALYSIS_CACHE_TTL_SECONDS = 600
ANALYSIS_CACHE_VERSION = "v21-overall-github-signal-scoring"
_ANALYSIS_CACHE: dict[str, tuple[datetime, dict[str, Any]]] = {}
PR_MERGE_PATTERN = re.compile(r"merge pull request|\bpr\b|pull request", flags=re.IGNORECASE)


def _cache_key(username: str) -> str:
    return f"{ANALYSIS_CACHE_VERSION}:{username.strip().lower()}"


def _get_cached_analysis(username: str, allow_stale: bool = False) -> dict[str, Any] | None:
    key = _cache_key(username)
    cached = _ANALYSIS_CACHE.get(key)
    if not cached:
        return None

    created_at, payload = cached
    age_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
    if not allow_stale and age_seconds > ANALYSIS_CACHE_TTL_SECONDS:
        return None
    return copy.deepcopy(payload)


def _store_cached_analysis(username: str, payload: dict[str, Any]) -> None:
    _ANALYSIS_CACHE[_cache_key(username)] = (datetime.now(timezone.utc), copy.deepcopy(payload))


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.replace("Z", "+00:00")
    return datetime.fromisoformat(cleaned)


def _week_index(date_value: datetime, start: datetime, weeks: int) -> int | None:
    delta_days = (date_value - start).days
    if delta_days < 0:
        return None
    index = delta_days // 7
    return index if 0 <= index < weeks else None


def _language_share(raw_languages: dict[str, int]) -> dict[str, float]:
    total = sum(raw_languages.values())
    if total <= 0:
        return {}
    return {name: round((count / total) * 100, 2) for name, count in raw_languages.items()}


def _entropy(shares: dict[str, float]) -> float:
    ratios = [value / 100 for value in shares.values() if value > 0]
    return round(-sum(ratio * math.log(ratio, 2) for ratio in ratios), 4) if ratios else 0.0


def _repo_quality_score(repo: dict[str, Any]) -> float:
    issues = math.log1p(float(repo.get("open_issues_count", 0)))
    archived_penalty = 12.0 if repo.get("archived") else 0.0
    fork_penalty = 14.0 if repo.get("fork", False) else 0.0
    recency_bonus = 10.0 if repo.get("pushed_at") else 0.0
    description_bonus = 5.0 if repo.get("description") else 0.0
    activity_bonus = 4.0 if repo.get("updated_at") else 0.0
    score = 24 + recency_bonus + description_bonus + activity_bonus - issues * 4.0 - archived_penalty - fork_penalty
    return round(max(0.0, min(score, 100.0)), 2)


def _project_complexity_score(repo: dict[str, Any], repo_languages: dict[str, int]) -> float:
    size_norm = min(math.log1p(float(repo.get("size", 0))) / 9.0, 1.0)
    language_count_norm = min(len([v for v in repo_languages.values() if v > 0]) / 6.0, 1.0)
    issues_norm = min(math.log1p(float(repo.get("open_issues_count", 0))) / 5.0, 1.0)
    has_description = 1.0 if repo.get("description") else 0.0
    active_bonus = 1.0 if repo.get("pushed_at") else 0.0

    complexity = (
        size_norm * 0.30
        + language_count_norm * 0.25
        + issues_norm * 0.15
        + has_description * 0.08
        + active_bonus * 0.12
    ) * 100

    if repo.get("archived"):
        complexity *= 0.75
    return round(max(0.0, min(complexity, 100.0)), 2)


def _skill_classification(language_shares: dict[str, float], repo_stats: list[dict[str, Any]]) -> str:
    primary_languages = {name.lower() for name, share in language_shares.items() if share >= 18}
    frontend_markers = {"javascript", "typescript", "html", "css", "vue", "svelte"}
    backend_markers = {"python", "java", "go", "ruby", "rust", "c#", "php", "kotlin"}
    if primary_languages & frontend_markers and primary_languages & backend_markers:
        return "Full-stack"
    if primary_languages & frontend_markers:
        return "Frontend"
    if primary_languages & backend_markers:
        return "Backend"
    languages = [item.get("language") for item in repo_stats if item.get("language")]
    if languages and any(language.lower() in frontend_markers for language in languages) and any(language.lower() in backend_markers for language in languages):
        return "Full-stack"
    if languages and any(language.lower() in frontend_markers for language in languages):
        return "Frontend"
    return "Backend"


async def _analyze_user_live(username: str, settings: Settings) -> dict[str, Any]:
    cached = _get_cached_analysis(username)
    if cached is not None:
        return cached

    client = GitHubClient(settings)
    try:
        profile, repos, public_events = await asyncio.gather(
            client.fetch_user(username),
            client.fetch_repos(username),
            client.fetch_public_events(username),
        )
        repos = sorted(repos, key=lambda item: item.get("updated_at") or "", reverse=True)
        if settings.max_repos > 0:
            repos = repos[: settings.max_repos]

        now_utc = datetime.now(timezone.utc)
        profile_created_at = _parse_datetime(profile.get("created_at"))
        window_start = profile_created_at or now_utc
        effective_weeks = max(1, ((now_utc - window_start).days // 7) + 1)

        language_totals: dict[str, int] = defaultdict(int)
        repo_stats: list[dict[str, Any]] = []
        all_commits: list[dict[str, Any]] = []
        activity_by_week = [0 for _ in range(effective_weeks)]
        heatmap_counts: Counter[str] = Counter()
        repo_timeline: list[dict[str, Any]] = []
        repo_update_scores: list[float] = [0.0 for _ in range(effective_weeks)]
        commit_intelligence: list[dict[str, Any]] = []
        weekly_repo_sets: list[set[str]] = [set() for _ in range(effective_weeks)]
        weekly_low_value_commits = [0 for _ in range(effective_weeks)]
        weekly_pr_merge_commits = [0 for _ in range(effective_weeks)]
        weekly_review_events = [0 for _ in range(effective_weeks)]
        repo_popularity_scores: list[float] = []
        owned_repo_count = 0
        collaborated_repo_count = 0
        active_repo_count = 0

        repo_fetch_tasks = []
        for repo in repos:
            owner = repo["owner"]["login"]
            repo_name = repo["name"]
            repo_fetch_tasks.append(client.fetch_repo_languages(owner, repo_name))

        language_results = await asyncio.gather(*repo_fetch_tasks, return_exceptions=True)
        language_maps: list[dict[str, int]] = []
        for result in language_results:
            language_maps.append(result if isinstance(result, dict) else {})

        commit_tasks = []
        for repo in repos:
            owner = repo["owner"]["login"]
            repo_name = repo["name"]
            commit_tasks.append(
                client.fetch_commits_for_repo(
                    owner,
                    repo_name,
                    username,
                    window_start,
                    max_pages=None,
                    max_commits=None,
                )
            )

        commit_batches = await asyncio.gather(*commit_tasks, return_exceptions=True)

        for index, repo in enumerate(repos):
            repo_languages = language_maps[index]
            for language_name, bytes_count in repo_languages.items():
                language_totals[language_name] += int(bytes_count)

            repo_owner_login = str((repo.get("owner") or {}).get("login") or "").strip()
            requested_login = str(profile.get("login") or username).strip()
            is_collaborated = bool(repo_owner_login) and repo_owner_login.lower() != requested_login.lower()
            if is_collaborated:
                collaborated_repo_count += 1
            else:
                owned_repo_count += 1

            quality_score = _repo_quality_score(repo)
            complexity_score = _project_complexity_score(repo, repo_languages)
            popularity_score = min(
                (
                    math.log1p(float(repo.get("stargazers_count", 0))) * 0.55
                    + math.log1p(float(repo.get("forks_count", 0))) * 0.30
                    + math.log1p(float(repo.get("watchers_count", 0))) * 0.15
                )
                / 5.0,
                1.0,
            )
            repo_popularity_scores.append(popularity_score)
            repo_last_updated = _parse_datetime(repo.get("pushed_at") or repo.get("updated_at"))
            activity_score = 0.0
            if repo_last_updated:
                age_days = max((datetime.now(timezone.utc) - repo_last_updated).days, 0)
                activity_score = round(max(0.0, 100.0 - min(age_days, 365) / 2.2), 2)
            if activity_score >= 35.0 or quality_score >= 55.0:
                active_repo_count += 1

            repo_stats.append(
                {
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "html_url": repo["html_url"],
                    "owner_login": repo_owner_login,
                    "is_collaborated": is_collaborated,
                    "description": repo.get("description"),
                    "language": repo.get("language"),
                    "stars": repo.get("stargazers_count", 0),
                    "forks": repo.get("forks_count", 0),
                    "watchers": repo.get("watchers_count", 0),
                    "open_issues": repo.get("open_issues_count", 0),
                    "updated_at": repo.get("updated_at"),
                    "pushed_at": repo.get("pushed_at"),
                    "quality_score": quality_score,
                    "complexity_score": complexity_score,
                    "activity_score": activity_score,
                }
            )

            batch = commit_batches[index]
            if isinstance(batch, Exception):
                continue
            for commit in batch:
                commit_date = _parse_datetime(commit.get("commit", {}).get("committer", {}).get("date"))
                if not commit_date:
                    continue
                week_idx = _week_index(commit_date, window_start, effective_weeks)
                if week_idx is None:
                    continue
                activity_by_week[week_idx] += 1
                repo_update_scores[week_idx] = min(repo_update_scores[week_idx] + 0.6, 1.0)
                weekly_repo_sets[week_idx].add(repo["full_name"])
                heatmap_key = commit_date.strftime("%Y-%m-%d")
                heatmap_counts[heatmap_key] += 1

                message = commit.get("commit", {}).get("message", "")
                intelligence = classify_commit_message(message)
                if intelligence.tag == "Low Value":
                    weekly_low_value_commits[week_idx] += 1
                if PR_MERGE_PATTERN.search(message):
                    weekly_pr_merge_commits[week_idx] += 1
                commit_intelligence.append(
                    {
                        "repo": repo["name"],
                        "message": message.splitlines()[0][:120],
                        "date": commit_date.isoformat(),
                        "sha": commit.get("sha", "")[:10],
                        "tag": intelligence.tag,
                        "intent": intelligence.intent,
                        "sentiment": intelligence.sentiment,
                    }
                )
                all_commits.append(commit)

            repo_timeline.append(
                {
                    "name": repo["name"],
                    "updated_at": repo.get("updated_at"),
                    "pushed_at": repo.get("pushed_at"),
                    "quality_score": quality_score,
                    "activity_score": activity_score,
                }
            )

        for event in public_events:
            event_type = str(event.get("type") or "")
            if event_type not in {"PullRequestReviewEvent", "PullRequestReviewCommentEvent"}:
                continue
            event_date = _parse_datetime((event.get("created_at") or None))
            if not event_date:
                continue
            week_idx = _week_index(event_date, window_start, effective_weeks)
            if week_idx is None:
                continue
            weekly_review_events[week_idx] += 1

        language_share = _language_share(dict(language_totals))
        language_entropy = _entropy(language_share)
        meaningful_languages = [name for name, share in language_share.items() if share >= 3.0]
        language_coverage = min(len(meaningful_languages) / 8.0, 1.0)
        total_commits = sum(activity_by_week)
        active_weeks = sum(1 for value in activity_by_week if value > 0)
        avg_commits = total_commits / effective_weeks if effective_weeks else 0.0
        consistency = min((active_weeks / effective_weeks) * 0.7 + (avg_commits / 12.0) * 0.3, 1.0)
        contribution_volume = min(math.log1p(total_commits) / math.log1p(80), 1.0)
        repo_quality = min((sum(item["quality_score"] for item in repo_stats) / max(len(repo_stats), 1)) / 100, 1.0)
        project_complexity = min((sum(item["complexity_score"] for item in repo_stats) / max(len(repo_stats), 1)) / 100, 1.0)
        engagement = min(
            (len(repo_stats) / 12.0) * 0.22
            + (total_commits / 80.0) * 0.42
            + (active_repo_count / max(len(repo_stats), 1)) * 0.36,
            1.0,
        )
        language_diversity = min(language_entropy / 4.0, 1.0)
        activity_recency = min(sum(activity_by_week[-6:]) / 40.0, 1.0)
        commit_intent = min(sum(1.0 if item["tag"] != "Low Value" else 0.2 for item in commit_intelligence) / max(len(commit_intelligence), 1), 1.0)
        low_value_count = sum(1 for item in commit_intelligence if item["tag"] == "Low Value")
        risk_penalty = min(low_value_count / max(len(commit_intelligence), 1), 1.0)
        profile_followers = int(profile.get("followers", 0) or 0)
        profile_following = int(profile.get("following", 0) or 0)
        profile_public_repos = int(profile.get("public_repos", 0) or 0)
        account_age_days = max((now_utc - profile_created_at).days, 0) if profile_created_at else 0
        account_maturity = min(math.log1p(account_age_days / 30.0) / math.log1p(120), 1.0) if account_age_days > 0 else 0.0
        profile_popularity = min(math.log1p(profile_followers) / math.log1p(500), 1.0) if profile_followers > 0 else 0.0
        portfolio_breadth = min(math.log1p(max(len(repo_stats), profile_public_repos)) / math.log1p(30), 1.0)
        collaboration_depth = min(collaborated_repo_count / max(len(repo_stats), 1), 1.0)
        impact_signals = min(sum(repo_popularity_scores) / max(len(repo_popularity_scores), 1), 1.0)

        metrics = {
            "consistency": consistency,
            "contribution_volume": contribution_volume,
            "repo_quality": repo_quality,
            "project_complexity": project_complexity,
            "engagement": engagement,
            "language_diversity": language_diversity,
            "language_coverage": language_coverage,
            "activity_recency": activity_recency,
            "commit_intent": commit_intent,
            "risk_penalty": risk_penalty,
            "account_maturity": account_maturity,
            "profile_popularity": profile_popularity,
            "portfolio_breadth": portfolio_breadth,
            "collaboration_depth": collaboration_depth,
            "impact_signals": impact_signals,
        }

        repo_breadth_denominator = float(max(len(repos), 1))
        max_review_events = max(weekly_review_events) if weekly_review_events else 0
        weekly_repo_breadth = [min(len(week_repos) / repo_breadth_denominator, 1.0) for week_repos in weekly_repo_sets]
        weekly_low_value_ratio = [
            (weekly_low_value_commits[index] / commits) if commits > 0 else 0.0
            for index, commits in enumerate(activity_by_week)
        ]
        weekly_pr_merge_ratio = [
            (weekly_pr_merge_commits[index] / commits) if commits > 0 else 0.0
            for index, commits in enumerate(activity_by_week)
        ]
        weekly_review_activity = [
            (weekly_review_events[index] / max_review_events) if max_review_events > 0 else 0.0
            for index in range(effective_weeks)
        ]

        hmm_result = infer_hmm_state(
            activity_by_week,
            weekly_repo_breadth,
            weekly_low_value_ratio,
            weekly_pr_merge_ratio,
            weekly_review_activity,
            repo_update_scores,
        )
        state = hmm_result.state
        trend = hmm_result.trend

        hmm_metrics = {
            "hmm_state_score": hmm_result.state_score,
            "hmm_confidence": hmm_result.confidence,
            "hmm_momentum": hmm_result.momentum,
            "hmm_stability": hmm_result.stability,
            "hmm_decline_risk": hmm_result.decline_risk,
        }
        metrics = {
            **hmm_metrics,
            **metrics,
        }
        hire_score, coefficients, score_diagnostics = predict_hire_score(metrics)

        # Guardrail: avoid mid/high scores for sparse or stale contribution histories.
        if total_commits == 0:
            hire_score = 0
        elif total_commits < 3:
            hire_score = min(hire_score, 20)
        elif total_commits < 10:
            hire_score = min(hire_score, 40)
        elif total_commits < 20 and consistency < 0.25 and activity_recency < 0.15:
            hire_score = min(hire_score, 55)

        risks: list[str] = []
        if total_commits == 0:
            risks.append("No contribution activity was detected in the selected period.")
        if account_maturity < 0.15 and total_commits < 5:
            risks.append("The GitHub history is still thin, so the score has limited historical evidence.")
        if risk_penalty >= 0.35:
            risks.append("A noticeable share of commits are low-signal or maintenance-heavy.")
        if min(activity_by_week[-8:], default=0) == 0:
            risks.append("Recent activity gaps indicate inconsistent momentum.")
        if repo_quality < 0.45:
            risks.append("Repository quality signals are below the hiring threshold.")
        if engagement < 0.2:
            risks.append("Community engagement is limited relative to activity.")
        if impact_signals < 0.12 and len(repo_stats) > 0:
            risks.append("Public repository impact is limited, so the score relies mostly on activity signals.")
        if hmm_result.decline_risk >= 0.45:
            risks.append("HMM indicates elevated short-term decline risk.")
        if hmm_result.stability < 0.45:
            risks.append("Hidden state trajectory is unstable across recent weeks.")

        recommendation = determine_recommendation(hire_score, state, risks, hmm_metrics)
        if total_commits == 0:
            state = "Insufficient Evidence"
            trend = "No Activity"
            recommendation = "Insufficient Evidence"
        elif total_commits < 3 or (account_maturity < 0.15 and total_commits < 5):
            recommendation = "Insufficient Evidence"
        elif total_commits < 10 and hire_score < 45:
            recommendation = "Needs Review"

        full_window_commits = activity_by_week
        activity_heatmap = [{"date": key, "count": count} for key, count in sorted(heatmap_counts.items())]

        commits_for_frontend = sorted(
            commit_intelligence,
            key=lambda item: item["date"],
            reverse=True,
        )[:40]

        profile_payload = {
            "login": profile.get("login", username),
            "name": profile.get("name"),
            "bio": profile.get("bio"),
            "avatar_url": profile.get("avatar_url"),
            "html_url": profile.get("html_url"),
            "company": profile.get("company"),
            "location": profile.get("location"),
            "followers": profile.get("followers", 0),
            "following": profile.get("following", 0),
            "public_repos": profile.get("public_repos", 0),
            "public_gists": profile.get("public_gists", 0),
            "created_at": profile.get("created_at"),
            "updated_at": profile.get("updated_at"),
        }

        skill = _skill_classification(language_share, repo_stats)
        technical_projects = [
            repo
            for repo in repo_stats
            if (repo.get("complexity_score", 0) >= 45 or repo.get("quality_score", 0) >= 50)
            and repo.get("language")
        ]
        if total_commits == 0:
            strength_insight = "No contribution activity was detected in the selected period."
            language_style = "has not shown enough contribution activity to infer a reliable coding pattern"
        else:
            strength_insight = f"This developer looks strongest in {skill.lower()} work."
            language_style = "works across many languages" if language_entropy > 1.6 else "mostly focuses on a small set of languages"
        insights = [
            strength_insight,
            f"They made {total_commits} commits during the selected time period.",
            f"The GitHub account is about {account_age_days // 365} year(s) old with {profile_public_repos} public repos, {profile_followers} followers, and {profile_following} following.",
            f"Repository mix includes {owned_repo_count} owned repo(s) and {collaborated_repo_count} collaborative repo(s).",
            f"HMM confidence is {hmm_result.confidence * 100:.0f}% with {hmm_result.decline_risk * 100:.0f}% next-step decline risk.",
            f"Hidden-state stability is {hmm_result.stability * 100:.0f}% and momentum is {hmm_result.momentum * 100:.0f}/100.",
            f"Project complexity score is {project_complexity * 100:.0f}/100 and remains a major factor in the final score.",
            f"Their code activity {language_style}.",
            f"{len(meaningful_languages)} main language(s) are used regularly in their projects.",
            f"Overall contribution trend currently looks {state.lower()}.",
        ]
        if technical_projects:
            best_repo = max(technical_projects, key=lambda item: item["quality_score"])
            insights.append(f"Most standout project right now is {best_repo['name']}.")
        if recommendation == "Strong Hire":
            insights.append("This profile looks ready for a strong hire recommendation.")
        if recommendation == "Insufficient Evidence":
            insights.append("There is not enough contribution data to make a confident hiring judgment yet.")

        result = {
            "profile": profile_payload,
            "hire_score": hire_score,
            "state": state,
            "trend": trend,
            "recommendation": recommendation,
            "analytics": {
                "commits_per_week": full_window_commits,
                "languages": language_share,
                "repo_stats": repo_stats,
                "activity_heatmap": activity_heatmap,
                "repo_timeline": repo_timeline,
                "state_transitions": {
                    "sequence": hmm_result.sequence,
                    "matrix": hmm_result.transitions,
                },
                "commit_intelligence_all": commit_intelligence,
                "commit_intelligence": commits_for_frontend,
                "hidden_state_probabilities": hmm_result.probabilities,
                "hmm_diagnostics": {
                    "confidence": hmm_result.confidence,
                    "state_score": hmm_result.state_score,
                    "momentum": hmm_result.momentum,
                    "stability": hmm_result.stability,
                    "decline_risk": hmm_result.decline_risk,
                },
            },
            "insights": insights,
            "risks": risks,
            "score_breakdown": {
                **metrics,
                **score_diagnostics,
                **{f"coef_{key}": value for key, value in coefficients.items()},
            },
        }
        _store_cached_analysis(username, result)
        return result
    finally:
        await client.close()


async def analyze_user(username: str, settings: Settings) -> dict[str, Any]:
    try:
        return await _analyze_user_live(username, settings)
    except GitHubRateLimitError:
        stale = _get_cached_analysis(username, allow_stale=True)
        if stale is not None:
            stale.setdefault("insights", []).append("Serving cached full analysis due to temporary GitHub rate limits.")
            return stale
        raise
