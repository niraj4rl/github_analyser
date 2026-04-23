from __future__ import annotations

from dataclasses import dataclass
import math


STATE_NAMES = ["High Performer", "Consistent", "Inconsistent", "Declining"]
QUALITY_BY_STATE = [1.0, 0.72, 0.38, 0.08]

# Deterministic transition priors kept from the previous HMM configuration.
TRANSITIONS = [
    [0.64, 0.24, 0.08, 0.04],
    [0.18, 0.54, 0.18, 0.10],
    [0.05, 0.22, 0.50, 0.23],
    [0.04, 0.12, 0.24, 0.60],
]

# Per-state centroids for features:
# [commit_volume, repo_breadth, low_value_ratio, pr_merge_ratio, review_activity, repo_updates]
STATE_CENTROIDS = [
    [0.88, 0.78, 0.10, 0.62, 0.44, 0.82],
    [0.58, 0.54, 0.24, 0.38, 0.22, 0.56],
    [0.30, 0.32, 0.48, 0.20, 0.10, 0.30],
    [0.12, 0.16, 0.72, 0.08, 0.04, 0.12],
]


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


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, float(value)))


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _normalize_commit_volume(weekly_commits: list[int]) -> list[float]:
    if not weekly_commits:
        return [0.0]
    scaled = [math.log1p(max(0, int(value))) for value in weekly_commits]
    max_value = max(scaled) if scaled else 0.0
    if max_value <= 0:
        return [0.0 for _ in scaled]
    return [_clamp(value / max_value) for value in scaled]


def build_observations(
    weekly_commits: list[int],
    weekly_repo_breadth: list[float],
    weekly_low_value_ratio: list[float],
    weekly_pr_merge_ratio: list[float],
    weekly_review_activity: list[float],
    repo_updates: list[float],
) -> list[list[float]]:
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

    return [
        [
            _clamp(normalized_commit_volume[i]),
            _clamp(repo_breadth[i]),
            _clamp(low_value_ratio[i]),
            _clamp(pr_merge_ratio[i]),
            _clamp(weekly_review_activity[i]),
            _clamp(updates[i]),
        ]
        for i in range(length)
    ]


def _state_probabilities(observation: list[float]) -> list[float]:
    distances: list[float] = []
    for centroid in STATE_CENTROIDS:
        squared_sum = sum((observation[i] - centroid[i]) ** 2 for i in range(len(observation)))
        distances.append(math.sqrt(squared_sum))

    # Convert distance to a smooth confidence-like probability distribution.
    inverse = [1.0 / (distance + 1e-6) for distance in distances]
    total = sum(inverse)
    if total <= 0:
        return [0.25, 0.25, 0.25, 0.25]
    return [value / total for value in inverse]


def _infer_state_sequence(observations: list[list[float]]) -> tuple[list[int], list[list[float]]]:
    posteriors: list[list[float]] = []
    states: list[int] = []
    for observation in observations:
        probs = _state_probabilities(observation)
        posteriors.append(probs)
        states.append(max(range(len(probs)), key=lambda index: probs[index]))
    return states, posteriors


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
    state_sequence, posterior = _infer_state_sequence(observations)
    current_state_index = int(state_sequence[-1])
    current_state = STATE_NAMES[current_state_index]

    state_quality_sequence = [QUALITY_BY_STATE[index] for index in state_sequence]
    recent_quality = state_quality_sequence[-8:] if len(state_quality_sequence) >= 8 else state_quality_sequence
    previous_quality = (
        state_quality_sequence[-16:-8]
        if len(state_quality_sequence) >= 16
        else state_quality_sequence[: max(len(state_quality_sequence) // 2, 1)]
    )
    recent_average = _mean(recent_quality)
    previous_average = _mean(previous_quality) if previous_quality else recent_average
    momentum_raw = recent_average - previous_average

    if momentum_raw >= 0.08:
        trend = "Improving"
    elif momentum_raw <= -0.08:
        trend = "Declining"
    else:
        trend = "Stable"

    confidence = max(posterior[-1])
    state_score = float(QUALITY_BY_STATE[current_state_index])
    decline_risk = sum(posterior[-1][index] * TRANSITIONS[index][3] for index in range(len(STATE_NAMES)))
    recent_states = state_sequence[-12:] if len(state_sequence) >= 12 else state_sequence
    if len(recent_states) >= 2:
        same_count = sum(1 for i in range(1, len(recent_states)) if recent_states[i] == recent_states[i - 1])
        stability = same_count / (len(recent_states) - 1)
    else:
        stability = 1.0
    momentum = _clamp((momentum_raw + 1.0) / 2.0)

    probabilities = {STATE_NAMES[i]: float(posterior[-1][i]) for i in range(len(STATE_NAMES))}
    transitions = {
        STATE_NAMES[i]: {STATE_NAMES[j]: float(TRANSITIONS[i][j]) for j in range(len(STATE_NAMES))}
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
