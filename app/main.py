from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .analysis import analyze_user
from .config import get_settings
from .github_client import GitHubAPIError, GitHubClient, GitHubRateLimitError
from .schemas import AnalyzeRequest, SearchUsersResponseSchema


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DIST_DIR = BASE_DIR.parent / "dist"

settings = get_settings()

app = FastAPI(title=settings.app_title, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount React build dist folder if it exists (production)
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
else:
    # Mount static files for development (vanilla JS frontend)
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root() -> FileResponse:
    # Serve React build in production, fallback to vanilla JS in development
    if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
        return FileResponse(DIST_DIR / "index.html")
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/search-users", response_model=SearchUsersResponseSchema)
async def search_users(q: str):
    if not q.strip():
        return {"query": q, "results": []}

    client = GitHubClient(settings)
    try:
        items = await client.search_users(q.strip())
        usernames = [item.get("login") for item in items if item.get("login")]
        # Fetch detailed profiles for a subset to lower API pressure.
        detail_tasks = [client.fetch_user(username) for username in usernames[:3]]
        result_details_by_login: dict[str, dict] = {}
        for result in await asyncio.gather(*detail_tasks, return_exceptions=True):
            if isinstance(result, Exception):
                continue
            login = result.get("login")
            if login:
                result_details_by_login[login] = result
        suggestions = [
            {
                "login": base_item.get("login", ""),
                "name": detail_item.get("name"),
                "avatar_url": detail_item.get("avatar_url") or base_item.get("avatar_url"),
                "bio": detail_item.get("bio"),
                "html_url": detail_item.get("html_url") or base_item.get("html_url"),
                "followers": detail_item.get("followers", 0),
                "following": detail_item.get("following", 0),
                "public_repos": detail_item.get("public_repos", 0),
            }
            for base_item in items[:6]
            for detail_item in [result_details_by_login.get(base_item.get("login"), {})]
        ]
        return {"query": q, "results": suggestions}
    except GitHubRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    finally:
        await client.close()


@app.post("/analyze-user")
async def analyze(payload: AnalyzeRequest):
    try:
        return await analyze_user(payload.username, settings)
    except GitHubRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.get("/{path_name:path}")
async def spa_fallback(path_name: str) -> FileResponse:
    """Fallback route for SPA - serves index.html for non-API routes."""
    # Keep API routes reachable.
    if path_name in {"health", "search-users", "analyze-user"}:
        raise HTTPException(status_code=404)
    if path_name.startswith("static/") or path_name.startswith("assets/"):
        raise HTTPException(status_code=404)

    if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
        return FileResponse(DIST_DIR / "index.html")
    return FileResponse(STATIC_DIR / "index.html")
