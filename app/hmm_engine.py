from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from hmmlearn.hmm import GaussianHMM


STATE_NAMES = ["High Performer", "Consistent", "Inconsistent", "Declining"]


@dataclass
class HMMResult:
    state: str
    trend: str
    state_score: float
    confidence: float
    momentum: float
    stability: float
    decline_risk: float
    probabilities: dict[str, float]
    transitions: dict[str, dict[str, float]]
    sequence: list[str]


def _normalize_commit_volume(weekly_commits: list[int]) -> np.ndarray:
    values = np.array(weekly_commits, dtype=float)
    if values.size == 0:
        return np.array([0.0], dtype=float)
    # Log scaling keeps outlier weeks from dominating the latent-state signal.
    scaled = np.log1p(values)
    max_value = float(np.max(scaled))
    if max_value <= 0:
        return np.zeros_like(scaled)
    return np.clip(scaled / max_value, 0.0, 1.0)


def build_observations(
    weekly_commits: list[int],
    weekly_repo_breadth: list[float],
    weekly_low_value_ratio: list[float],
    weekly_pr_merge_ratio: list[float],
    weekly_review_activity: list[float],
    repo_updates: list[float],
) -> np.ndarray:
    length = max(
        1,
        len(weekly_commits),
        len(weekly_repo_breadth),
        len(weekly_low_value_ratio),
        len(weekly_pr_merge_ratio),
        len(weekly_review_activity),
        len(repo_updates),
    )

    commits = (weekly_commits + [0] * length)[:length]
    repo_breadth = (weekly_repo_breadth + [0.0] * length)[:length]
    low_value_ratio = (weekly_low_value_ratio + [0.0] * length)[:length]
    pr_merge_ratio = (weekly_pr_merge_ratio + [0.0] * length)[:length]
    review_activity = (weekly_review_activity + [0.0] * length)[:length]
    updates = (repo_updates + [0.0] * length)[:length]

    normalized_commit_volume = _normalize_commit_volume(commits)
    observations = np.column_stack(
        [
            normalized_commit_volume,
            np.clip(np.array(repo_breadth, dtype=float), 0.0, 1.0),
            np.clip(np.array(low_value_ratio, dtype=float), 0.0, 1.0),
            np.clip(np.array(pr_merge_ratio, dtype=float), 0.0, 1.0),
            np.clip(np.array(review_activity, dtype=float), 0.0, 1.0),
            np.clip(np.array(updates, dtype=float), 0.0, 1.0),
        ]
    )
    return observations


def _configured_hmm() -> GaussianHMM:
    model = GaussianHMM(n_components=4, covariance_type="diag", init_params="", params="")
    model.n_features = 6
    model.startprob_ = np.array([0.12, 0.42, 0.28, 0.18])
    model.transmat_ = np.array(
        [
            [0.64, 0.24, 0.08, 0.04],
            [0.18, 0.54, 0.18, 0.10],
            [0.05, 0.22, 0.50, 0.23],
            [0.04, 0.12, 0.24, 0.60],
        ]
    )
    model.means_ = np.array(
        [
            [0.88, 0.78, 0.10, 0.62, 0.44, 0.82],
            [0.58, 0.54, 0.24, 0.38, 0.22, 0.56],
            [0.30, 0.32, 0.48, 0.20, 0.10, 0.30],
            [0.12, 0.16, 0.72, 0.08, 0.04, 0.12],
        ]
    )
    model.covars_ = np.array(
        [
            [0.05, 0.05, 0.03, 0.04, 0.03, 0.04],
            [0.06, 0.06, 0.05, 0.05, 0.04, 0.05],
            [0.07, 0.07, 0.06, 0.06, 0.05, 0.06],
            [0.06, 0.06, 0.05, 0.05, 0.04, 0.05],
        ]
    )
    return model


def infer_hmm_state(
    weekly_commits: list[int],
    weekly_repo_breadth: list[float],
    weekly_low_value_ratio: list[float],
    weekly_pr_merge_ratio: list[float],
    weekly_review_activity: list[float],
    repo_updates: list[float],
) -> HMMResult:
    observations = build_observations(
        weekly_commits,
        weekly_repo_breadth,
        weekly_low_value_ratio,
        weekly_pr_merge_ratio,
        weekly_review_activity,
        repo_updates,
    )
    model = _configured_hmm()
    posterior = model.predict_proba(observations)
    state_sequence = model.predict(observations)
    current_state_index = int(state_sequence[-1])
    current_state = STATE_NAMES[current_state_index]

    quality_by_state = np.array([1.0, 0.72, 0.38, 0.08], dtype=float)
    state_quality_sequence = quality_by_state[state_sequence]
    recent_quality = state_quality_sequence[-8:] if len(state_quality_sequence) >= 8 else state_quality_sequence
    previous_quality = (
        state_quality_sequence[-16:-8]
        if len(state_quality_sequence) >= 16
        else state_quality_sequence[: max(len(state_quality_sequence) // 2, 1)]
    )
    recent_average = float(np.mean(recent_quality)) if len(recent_quality) else 0.0
    previous_average = float(np.mean(previous_quality)) if len(previous_quality) else recent_average
    momentum_raw = recent_average - previous_average

    if momentum_raw >= 0.08:
        trend = "Improving"
    elif momentum_raw <= -0.08:
        trend = "Declining"
    else:
        trend = "Stable"

    confidence = float(np.max(posterior[-1]))
    state_score = float(quality_by_state[current_state_index])
    decline_risk = float(np.dot(posterior[-1], model.transmat_[:, 3]))
    recent_states = state_sequence[-12:] if len(state_sequence) >= 12 else state_sequence
    stability = float(np.mean(recent_states[1:] == recent_states[:-1])) if len(recent_states) >= 2 else 1.0
    momentum = float(np.clip((momentum_raw + 1.0) / 2.0, 0.0, 1.0))

    probabilities = {STATE_NAMES[i]: float(posterior[-1][i]) for i in range(len(STATE_NAMES))}
    transitions = {
        STATE_NAMES[i]: {STATE_NAMES[j]: float(model.transmat_[i][j]) for j in range(len(STATE_NAMES))}
        for i in range(len(STATE_NAMES))
    }
    sequence = [STATE_NAMES[int(index)] for index in state_sequence[-min(12, len(state_sequence)):]]

    return HMMResult(
        state=current_state,
        trend=trend,
        state_score=state_score,
        confidence=confidence,
        momentum=momentum,
        stability=stability,
        decline_risk=decline_risk,
        probabilities=probabilities,
        transitions=transitions,
        sequence=sequence,
    )
