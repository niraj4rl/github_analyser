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
        per_page = 100
        page = 1
        while True:
            batch = await self._get(
                f"/users/{username}/repos",
                params={"sort": "updated", "per_page": per_page, "page": page, "type": "owner"},
            )
            repos.extend(batch)
            if len(batch) < per_page:
                break
            page += 1
        return repos

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
        max_pages: int = 2,
        max_commits: int = 60,
    ) -> list[dict[str, Any]]:
        commits: list[dict[str, Any]] = []
        per_page = min(100, max(20, max_commits))
        for page in range(1, max_pages + 1):
            batch = await self.fetch_commit_page(owner, repo, username, since, page, per_page=per_page)
            commits.extend(batch)
            if len(commits) >= max_commits:
                commits = commits[:max_commits]
                break
            if len(batch) < per_page:
                break
        return commits

    async def close_later(self, delay_seconds: float = 0.0) -> None:
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        await self.close()


def analysis_window(weeks: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(weeks=weeks)
