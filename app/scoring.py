from __future__ import annotations

from functools import lru_cache

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURE_ORDER = [
    "hmm_state_score",
    "hmm_confidence",
    "hmm_momentum",
    "hmm_stability",
    "hmm_decline_risk",
    "consistency",
    "repo_quality",
    "project_complexity",
    "engagement",
    "language_diversity",
    "language_coverage",
    "activity_recency",
    "commit_intent",
    "risk_penalty",
]


def build_feature_vector(metrics: dict[str, float]) -> np.ndarray:
    return np.array([[float(metrics[name]) for name in FEATURE_ORDER]], dtype=float)


@lru_cache(maxsize=1)
def get_score_model() -> Pipeline:
    rng = np.random.default_rng(42)
    samples = rng.uniform(0.0, 1.0, size=(2500, len(FEATURE_ORDER)))
    # HMM dynamics are weighted heavily to make temporal behavior a first-class signal.
    weights = np.array([0.19, 0.14, 0.12, 0.11, -0.16, 0.09, 0.08, 0.14, 0.06, 0.05, 0.03, 0.05, 0.04, -0.06])
    if len(weights) != len(FEATURE_ORDER):
        raise ValueError("weights length must match FEATURE_ORDER length")
    target = np.clip(samples @ weights * 100 + 20 + rng.normal(0, 4.5, size=samples.shape[0]), 0, 100)
    pipeline = Pipeline([("scaler", StandardScaler()), ("model", LinearRegression())])
    pipeline.fit(samples, target)
    return pipeline


def predict_hire_score(metrics: dict[str, float]) -> tuple[int, dict[str, float]]:
    model = get_score_model()
    vector = build_feature_vector(metrics)
    raw_score = float(model.predict(vector)[0])
    score = int(np.clip(round(raw_score), 0, 100))
    coefficients = dict(zip(FEATURE_ORDER, np.round(model.named_steps["model"].coef_, 4).tolist()))
    return score, coefficients


def determine_recommendation(score: int, state: str, risks: list[str], hmm_metrics: dict[str, float]) -> str:
    decline_risk = float(hmm_metrics.get("hmm_decline_risk", 0.0))
    stability = float(hmm_metrics.get("hmm_stability", 0.0))
    confidence = float(hmm_metrics.get("hmm_confidence", 0.0))
    momentum = float(hmm_metrics.get("hmm_momentum", 0.5))

    if decline_risk >= 0.62:
        return "Avoid"
    if state == "Declining" and decline_risk >= 0.48:
        return "Avoid"
    if score >= 82 and state in {"High Performer", "Consistent"} and decline_risk < 0.30 and stability >= 0.58 and confidence >= 0.45 and not risks:
        return "Strong Hire"
    if score >= 70 and state != "Declining" and decline_risk < 0.42:
        return "Hire"
    if score >= 55 or momentum >= 0.52:
        return "Needs Review"
    return "Avoid"
