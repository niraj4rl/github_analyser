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
    probabilities: dict[str, float]
    transitions: dict[str, dict[str, float]]
    sequence: list[str]


def build_observations(weekly_commits: list[int], activity_gaps: list[float], repo_updates: list[float]) -> np.ndarray:
    padded_commits = (weekly_commits + [0] * 52)[:52]
    padded_gaps = (activity_gaps + [1.0] * 52)[:52]
    padded_updates = (repo_updates + [0.0] * 52)[:52]
    observations = np.column_stack(
        [
            np.array(padded_commits, dtype=float),
            np.array(padded_gaps, dtype=float),
            np.array(padded_updates, dtype=float),
        ]
    )
    return observations


def _configured_hmm() -> GaussianHMM:
    model = GaussianHMM(n_components=4, covariance_type="diag", init_params="", params="")
    model.n_features = 3
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
            [16.0, 0.15, 0.90],
            [8.0, 0.30, 0.60],
            [3.0, 0.80, 0.30],
            [1.0, 1.20, 0.10],
        ]
    )
    model.covars_ = np.array(
        [
            [18.0, 0.20, 0.10],
            [10.0, 0.25, 0.15],
            [7.0, 0.35, 0.12],
            [4.0, 0.45, 0.08],
        ]
    )
    return model


def infer_hmm_state(weekly_commits: list[int], activity_gaps: list[float], repo_updates: list[float]) -> HMMResult:
    observations = build_observations(weekly_commits, activity_gaps, repo_updates)
    model = _configured_hmm()
    posterior = model.predict_proba(observations)
    state_sequence = model.predict(observations)
    current_state_index = int(state_sequence[-1])
    current_state = STATE_NAMES[current_state_index]

    recent_window = weekly_commits[-8:] if len(weekly_commits) >= 8 else weekly_commits
    previous_window = weekly_commits[-16:-8] if len(weekly_commits) >= 16 else weekly_commits[: max(len(weekly_commits) // 2, 1)]
    recent_average = float(np.mean(recent_window)) if recent_window else 0.0
    previous_average = float(np.mean(previous_window)) if previous_window else recent_average
    slope = recent_average - previous_average

    if slope >= 1.25:
        trend = "Improving"
    elif slope <= -1.25:
        trend = "Declining"
    else:
        trend = "Stable"

    probabilities = {STATE_NAMES[i]: float(posterior[-1][i]) for i in range(len(STATE_NAMES))}
    transitions = {
        STATE_NAMES[i]: {STATE_NAMES[j]: float(model.transmat_[i][j]) for j in range(len(STATE_NAMES))}
        for i in range(len(STATE_NAMES))
    }
    sequence = [STATE_NAMES[int(index)] for index in state_sequence[-min(12, len(state_sequence)):]]

    return HMMResult(
        state=current_state,
        trend=trend,
        probabilities=probabilities,
        transitions=transitions,
        sequence=sequence,
    )
