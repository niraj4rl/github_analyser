from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from .config import Settings


class GitHubAPIError(RuntimeError):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class GitHubRateLimitError(GitHubAPIError):
    def __init__(self, message: str, reset_at: str | None = None):
        super().__init__(message, status_code=429)
        self.reset_at = reset_at


class GitHubClient:
    def __init__(self, settings: Settings):
        token = (settings.github_token or "").strip()
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "intelligent-hiring-dashboard",
        }
        # Ignore scaffold placeholders so they do not trigger invalid credential errors.
        if token and "PASTE_YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE" not in token:
            headers["Authorization"] = f"Bearer {token}"

        self.settings = settings
        self.client = httpx.AsyncClient(
            base_url=settings.github_api_base,
            headers=headers,
            timeout=settings.request_timeout_seconds,
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        response = await self.client.get(path, params=params)
        if response.status_code == 401 and "Authorization" in self.client.headers:
            # Fall back to unauthenticated mode if token is invalid.
            self.client.headers.pop("Authorization", None)
            response = await self.client.get(path, params=params)
        if response.status_code == 403 and "rate limit" in response.text.lower():
            reset_at = response.headers.get("x-ratelimit-reset")
            raise GitHubRateLimitError(
                "GitHub rate limit exceeded. Add a valid GITHUB_TOKEN in .env for higher limits, then restart the server.",
                reset_at,
            )
        if response.status_code >= 400:
            try:
                detail = response.json().get("message", response.text)
            except Exception:
                detail = response.text
            raise GitHubAPIError(detail, status_code=response.status_code)
        return response.json()

    async def fetch_user(self, username: str) -> dict[str, Any]:
        return await self._get(f"/users/{username}")

    async def search_users(self, query: str, per_page: int = 6) -> list[dict[str, Any]]:
        payload = await self._get("/search/users", params={"q": query, "per_page": per_page})
        return payload.get("items", [])

    async def fetch_repos(self, username: str) -> list[dict[str, Any]]:
        repos: list[dict[str, Any]] = []
        seen_full_names: set[str] = set()
        per_page = 100
        page = 1
        while True:
            batch = await self._get(
                f"/users/{username}/repos",
                # Include public repos where the user is an org/team member or collaborator.
                params={"sort": "updated", "per_page": per_page, "page": page, "type": "all"},
            )
            for repo in batch:
                full_name = str(repo.get("full_name") or "").strip().lower()
                if not full_name or full_name in seen_full_names:
                    continue
                seen_full_names.add(full_name)
                repos.append(repo)
            if len(batch) < per_page:
                break
            page += 1

        # Supplement with repos from recent public events and commit search to better capture collaborations.
        public_event_repo_names = await self.fetch_public_event_repo_names(username)
        commit_search_repo_names = await self.fetch_commit_search_repo_names(username)
        discovered_repo_names: list[str] = []
        seen_discovered: set[str] = set()
        for repo_name in [*public_event_repo_names, *commit_search_repo_names]:
            normalized = repo_name.lower()
            if normalized in seen_discovered:
                continue
            seen_discovered.add(normalized)
            discovered_repo_names.append(repo_name)

        missing_repo_names = [name for name in discovered_repo_names if name.lower() not in seen_full_names]
        if missing_repo_names:
            detail_tasks = [self.fetch_repo_by_full_name(name) for name in missing_repo_names[:40]]
            detail_results = await asyncio.gather(*detail_tasks, return_exceptions=True)
            for result in detail_results:
                if not isinstance(result, dict):
                    continue
                full_name = str(result.get("full_name") or "").strip().lower()
                if not full_name or full_name in seen_full_names:
                    continue
                seen_full_names.add(full_name)
                repos.append(result)

        return repos

    async def fetch_repo_by_full_name(self, full_name: str) -> dict[str, Any]:
        return await self._get(f"/repos/{full_name}")

    async def fetch_public_event_repo_names(self, username: str, max_pages: int = 3, per_page: int = 100) -> list[str]:
        repo_names: list[str] = []
        seen: set[str] = set()
        for page in range(1, max_pages + 1):
            events = await self._get(
                f"/users/{username}/events/public",
                params={"page": page, "per_page": per_page},
            )
            if not isinstance(events, list) or not events:
                break

            for event in events:
                event_type = event.get("type")
                if event_type not in {"PushEvent", "PullRequestEvent", "PullRequestReviewEvent", "IssueCommentEvent", "CreateEvent"}:
                    continue
                repo_name = str((event.get("repo") or {}).get("name") or "").strip()
                if not repo_name:
                    continue
                normalized = repo_name.lower()
                if normalized in seen:
                    continue
                seen.add(normalized)
                repo_names.append(repo_name)

            if len(events) < per_page:
                break

        return repo_names

    async def fetch_public_events(self, username: str, max_pages: int = 3, per_page: int = 100) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        for page in range(1, max_pages + 1):
            batch = await self._get(
                f"/users/{username}/events/public",
                params={"page": page, "per_page": per_page},
            )
            if not isinstance(batch, list) or not batch:
                break
            events.extend(item for item in batch if isinstance(item, dict))
            if len(batch) < per_page:
                break
        return events

    async def fetch_commit_search_repo_names(self, username: str, max_pages: int = 2, per_page: int = 100) -> list[str]:
        repo_names: list[str] = []
        seen: set[str] = set()
        for page in range(1, max_pages + 1):
            payload = await self._get(
                "/search/commits",
                params={
                    "q": f"author:{username}",
                    "sort": "author-date",
                    "order": "desc",
                    "per_page": per_page,
                    "page": page,
                },
            )
            items = payload.get("items", []) if isinstance(payload, dict) else []
            if not items:
                break

            for item in items:
                repo_name = str((item.get("repository") or {}).get("full_name") or "").strip()
                if not repo_name:
                    continue
                normalized = repo_name.lower()
                if normalized in seen:
                    continue
                seen.add(normalized)
                repo_names.append(repo_name)

            if len(items) < per_page:
                break

        return repo_names

    async def fetch_repo_languages(self, owner: str, repo: str) -> dict[str, int]:
        return await self._get(f"/repos/{owner}/{repo}/languages")

    async def fetch_commit_page(
        self,
        owner: str,
        repo: str,
        username: str,
        since: datetime,
        page: int,
        per_page: int = 100,
    ) -> list[dict[str, Any]]:
        return await self._get(
            f"/repos/{owner}/{repo}/commits",
            params={
                "author": username,
                "per_page": per_page,
                "page": page,
                "since": since.astimezone(timezone.utc).isoformat(),
            },
        )

    async def fetch_commits_for_repo(
        self,
        owner: str,
        repo: str,
        username: str,
        since: datetime,
        max_pages: int | None = 2,
        max_commits: int | None = 60,
    ) -> list[dict[str, Any]]:
        commits: list[dict[str, Any]] = []
        per_page = 100 if max_commits is None else min(100, max(20, max_commits))
        page = 1
        while True:
            batch = await self.fetch_commit_page(owner, repo, username, since, page, per_page=per_page)
            commits.extend(batch)
            if max_commits is not None and len(commits) >= max_commits:
                commits = commits[:max_commits]
                break
            if len(batch) < per_page:
                break
            page += 1
            if max_pages is not None and page > max_pages:
                break
        return commits

    async def close_later(self, delay_seconds: float = 0.0) -> None:
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        await self.close()


def analysis_window(weeks: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(weeks=weeks)
