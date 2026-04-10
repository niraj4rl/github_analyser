from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_title: str = "Intelligent Developer Hiring & Analytics System"
    github_token: str | None = None
    github_api_base: str = "https://api.github.com"
    max_repos: int = 6
    max_commits_per_repo: int = 60
    analysis_weeks: int = 52
    request_timeout_seconds: float = 20.0


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
