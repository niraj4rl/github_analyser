from __future__ import annotations

from functools import lru_cache

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURE_ORDER = [
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
    # Project complexity is intentionally weighted highest.
    weights = np.array([0.16, 0.14, 0.28, 0.12, 0.08, 0.07, 0.08, 0.08, -0.07])
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


def determine_recommendation(score: int, state: str, risks: list[str]) -> str:
    if score >= 82 and state in {"High Performer", "Consistent"} and not risks:
        return "Strong Hire"
    if score >= 70 and state != "Declining":
        return "Hire"
    if score >= 55:
        return "Needs Review"
    return "Avoid"
