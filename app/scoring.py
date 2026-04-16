from __future__ import annotations

FEATURE_ORDER = [
    "hmm_state_score",
    "hmm_confidence",
    "hmm_momentum",
    "hmm_stability",
    "hmm_decline_risk",
    "consistency",
    "contribution_volume",
    "repo_quality",
    "project_complexity",
    "engagement",
    "language_diversity",
    "language_coverage",
    "activity_recency",
    "commit_intent",
    "risk_penalty",
    "account_maturity",
    "profile_popularity",
    "portfolio_breadth",
    "collaboration_depth",
    "impact_signals",
]

FEATURE_WEIGHTS = {
    "hmm_state_score": 0.05,
    "hmm_confidence": 0.04,
    "hmm_momentum": 0.04,
    "hmm_stability": 0.04,
    "hmm_decline_risk": -0.05,
    "consistency": 0.08,
    "contribution_volume": 0.10,
    "repo_quality": 0.18,
    "project_complexity": 0.18,
    "engagement": 0.04,
    "language_diversity": 0.03,
    "language_coverage": 0.03,
    "activity_recency": 0.06,
    "commit_intent": 0.04,
    "risk_penalty": -0.05,
    "account_maturity": 0.04,
    "profile_popularity": 0.02,
    "portfolio_breadth": 0.04,
    "collaboration_depth": 0.03,
    "impact_signals": 0.03,
}

BASE_SCORE = 12.0


def _clamp_score(value: float) -> int:
    return int(round(max(0.0, min(value, 100.0))))


def _evidence_cap(metrics: dict[str, float], score: float) -> float:
    contribution_volume = float(metrics.get("contribution_volume", 0.0))
    consistency = float(metrics.get("consistency", 0.0))
    activity_recency = float(metrics.get("activity_recency", 0.0))

    if contribution_volume <= 0.0:
        return 0.0
    if contribution_volume < 0.12:
        return min(score, 28.0)
    if contribution_volume < 0.22:
        return min(score, 40.0 if consistency < 0.35 or activity_recency < 0.20 else 48.0)
    if contribution_volume < 0.35:
        return min(score, 60.0 if consistency < 0.45 else 68.0)
    return score


def _evidence_strength(metrics: dict[str, float]) -> float:
    contribution_volume = float(metrics.get("contribution_volume", 0.0))
    activity_recency = float(metrics.get("activity_recency", 0.0))
    consistency = float(metrics.get("consistency", 0.0))
    account_maturity = float(metrics.get("account_maturity", 0.0))
    portfolio_breadth = float(metrics.get("portfolio_breadth", 0.0))
    return max(
        0.0,
        min(
            contribution_volume * 0.20
            + activity_recency * 0.15
            + consistency * 0.12
            + account_maturity * 0.10
            + portfolio_breadth * 0.43,
            1.0,
        ),
    )


def predict_hire_score(metrics: dict[str, float]) -> tuple[int, dict[str, float], dict[str, float]]:
    weighted_total = 0.0
    coefficients: dict[str, float] = {}
    contributions: dict[str, float] = {}

    for feature in FEATURE_ORDER:
        value = float(metrics.get(feature, 0.0))
        weight = FEATURE_WEIGHTS[feature]
        contribution = value * weight * 100.0
        weighted_total += contribution
        coefficients[feature] = round(weight, 4)
        contributions[feature] = round(contribution, 4)

    raw_score = BASE_SCORE + weighted_total
    evidence_strength = _evidence_strength(metrics)
    evidence_multiplier = 0.52 + 0.48 * evidence_strength
    calibrated_score = raw_score * evidence_multiplier
    capped_score = _evidence_cap(metrics, calibrated_score)

    diagnostics = {
        "base_score": float(BASE_SCORE),
        "weighted_total": float(round(weighted_total, 4)),
        "raw_score": float(round(raw_score, 4)),
        "evidence_strength": float(round(evidence_strength, 4)),
        "evidence_multiplier": float(round(evidence_multiplier, 4)),
        "calibrated_score": float(round(calibrated_score, 4)),
        "capped_score": float(round(capped_score, 4)),
    }

    return _clamp_score(capped_score), coefficients, {**diagnostics, **{f"contrib_{k}": v for k, v in contributions.items()}}


def determine_recommendation(score: int, state: str, risks: list[str], hmm_metrics: dict[str, float]) -> str:
    decline_risk = float(hmm_metrics.get("hmm_decline_risk", 0.0))
    stability = float(hmm_metrics.get("hmm_stability", 0.0))
    confidence = float(hmm_metrics.get("hmm_confidence", 0.0))
    momentum = float(hmm_metrics.get("hmm_momentum", 0.5))

    if decline_risk >= 0.62:
        return "Avoid"
    if state == "Declining" and decline_risk >= 0.48:
        return "Avoid"
    if score < 30 and ("No contribution activity was detected in the selected period." in risks or stability < 0.35):
        return "Insufficient Evidence"
    if score >= 82 and state in {"High Performer", "Consistent"} and decline_risk < 0.30 and stability >= 0.58 and confidence >= 0.45 and not risks:
        return "Strong Hire"
    if score >= 70 and state != "Declining" and decline_risk < 0.42:
        return "Hire"
    if score >= 55 or momentum >= 0.52:
        return "Needs Review"
    return "Avoid"
