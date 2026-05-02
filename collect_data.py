from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from app.analysis import analyze_user
from app.config import get_settings
from app.database import init_db, insert_analysis_result, insert_commit_classification, insert_user


DEFAULT_OUTPUT_DIR = Path("exports")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Collect GitHub analysis data and store it in PostgreSQL.")
    parser.add_argument("usernames", nargs="+", help="One or more GitHub usernames to analyze.")
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory to write JSON snapshots for each analysis run.",
    )
    parser.add_argument(
        "--store-json",
        action="store_true",
        help="Write each full analysis payload to disk as JSON.",
    )
    return parser


def _ensure_output_dir(path: str) -> Path:
    output_dir = Path(path)
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _store_analysis_payload(username: str, payload: dict[str, Any], output_dir: Path) -> None:
    file_path = output_dir / f"{username.lower()}_analysis.json"
    file_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")


async def _collect_one(username: str, output_dir: Path, store_json: bool) -> dict[str, Any]:
    settings = get_settings()
    payload = await analyze_user(username, settings)

    profile = payload["profile"]
    user_id = insert_user(profile)
    insert_analysis_result(user_id, payload)

    analytics = payload.get("analytics", {})
    commit_items = analytics.get("commit_intelligence_all") or analytics.get("commit_intelligence", [])
    for commit in commit_items:
        insert_commit_classification(
            user_id,
            {
                "repo_name": commit.get("repo"),
                "commit_sha": commit.get("sha"),
                "message": commit.get("message"),
                "tag": commit.get("tag"),
                "intent": commit.get("intent"),
                "sentiment": commit.get("sentiment"),
                "intent_score": None,
            },
        )

    if store_json:
        _store_analysis_payload(username, payload, output_dir)

    return payload


async def _run(usernames: list[str], output_dir: Path, store_json: bool) -> None:
    init_db()
    for username in usernames:
        print(f"Analyzing {username}...")
        payload = await _collect_one(username, output_dir, store_json)
        print(f"  hire_score={payload['hire_score']} state={payload['state']} recommendation={payload['recommendation']}")


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    output_dir = _ensure_output_dir(args.output_dir)
    asyncio.run(_run(args.usernames, output_dir, args.store_json))


if __name__ == "__main__":
    main()