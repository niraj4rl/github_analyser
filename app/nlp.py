from __future__ import annotations

import re
from dataclasses import dataclass


FEATURE_PATTERNS = (r"\bfeat\b", r"\bfeature\b", r"\badd\b", r"\bimplement\b", r"\bcreate\b", r"\bintroduce\b")
BUG_PATTERNS = (r"\bfix\b", r"\bbug\b", r"\bpatch\b", r"\bresolve\b", r"\bhotfix\b", r"\berror\b")
REFACTOR_PATTERNS = (r"\brefactor\b", r"\bcleanup\b", r"\bclean up\b", r"\boptimi[sz]e\b", r"\brestructure\b")
LOW_VALUE_PATTERNS = (r"\btypo\b", r"\bwhitespace\b", r"\bformat\b", r"\bchore\b", r"\bupdate readme\b", r"\bmisc\b")


@dataclass
class CommitIntelligence:
    tag: str
    intent: str
    sentiment: str
    intent_score: float


def _score_patterns(message: str, patterns: tuple[str, ...]) -> int:
    return sum(1 for pattern in patterns if re.search(pattern, message, flags=re.IGNORECASE))


def classify_commit_message(message: str) -> CommitIntelligence:
    normalized = message.strip().lower()
    feature = _score_patterns(normalized, FEATURE_PATTERNS)
    bug = _score_patterns(normalized, BUG_PATTERNS)
    refactor = _score_patterns(normalized, REFACTOR_PATTERNS)
    low_value = _score_patterns(normalized, LOW_VALUE_PATTERNS)

    if feature >= max(bug, refactor, low_value):
        tag, intent = "Feature", "Feature development"
        intent_score = 0.85
    elif bug >= max(feature, refactor, low_value):
        tag, intent = "Bug Fix", "Bug fixing"
        intent_score = 0.8
    elif refactor >= max(feature, bug, low_value):
        tag, intent = "Refactor", "Refactoring"
        intent_score = 0.7
    else:
        tag, intent = "Low Value", "Low-value commit"
        intent_score = 0.3

    sentiment = "Positive" if feature > 0 or refactor > 0 else "Neutral" if bug > 0 else "Low Signal"
    if low_value > 0 and feature == bug == refactor == 0:
        sentiment = "Low Signal"

    return CommitIntelligence(tag=tag, intent=intent, sentiment=sentiment, intent_score=intent_score)
