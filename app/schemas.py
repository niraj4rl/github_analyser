from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)


class ProfileSchema(BaseModel):
    login: str
    name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    html_url: str | None = None
    company: str | None = None
    location: str | None = None
    followers: int = 0
    following: int = 0
    public_repos: int = 0
    public_gists: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class RepoStatSchema(BaseModel):
    name: str
    full_name: str
    html_url: str
    description: str | None = None
    language: str | None = None
    stars: int = 0
    forks: int = 0
    watchers: int = 0
    open_issues: int = 0
    updated_at: str | None = None
    pushed_at: str | None = None
    quality_score: float = 0.0
    activity_score: float = 0.0


class CommitItemSchema(BaseModel):
    repo: str
    message: str
    date: str
    sha: str
    tag: str
    intent: str
    sentiment: str


class AnalysisBundleSchema(BaseModel):
    commits_per_week: list[int]
    languages: dict[str, float]
    repo_stats: list[RepoStatSchema]
    activity_heatmap: list[dict[str, Any]]
    repo_timeline: list[dict[str, Any]]
    state_transitions: dict[str, Any]
    commit_intelligence: list[CommitItemSchema]
    hidden_state_probabilities: dict[str, float]


class AnalysisResponseSchema(BaseModel):
    profile: ProfileSchema
    hire_score: int
    state: str
    trend: str
    recommendation: str
    analytics: AnalysisBundleSchema
    insights: list[str]
    risks: list[str]
    score_breakdown: dict[str, float]


class SearchUserSuggestionSchema(BaseModel):
    login: str
    name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    html_url: str | None = None
    followers: int = 0
    following: int = 0
    public_repos: int = 0


class SearchUsersResponseSchema(BaseModel):
    query: str
    results: list[SearchUserSuggestionSchema]
