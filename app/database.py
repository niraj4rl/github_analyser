
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Any, Dict, Optional

# Load .env file
load_dotenv()


def _env(primary_key: str, fallback_key: str, default: str) -> str:
    value = os.getenv(primary_key)
    if value is not None and value != "":
        return value
    fallback = os.getenv(fallback_key)
    if fallback is not None and fallback != "":
        return fallback
    return default

def get_connection():
    return psycopg2.connect(
        dbname=_env("DB_NAME", "PGDATABASE", "gitinsight"),
        user=_env("DB_USER", "PGUSER", "postgres"),
        password=_env("DB_PASSWORD", "PGPASSWORD", "postgres"),
        host=_env("DB_HOST", "PGHOST", "localhost"),
        port=_env("DB_PORT", "PGPORT", "5432"),
        cursor_factory=RealDictCursor
    )

def init_db():
    with get_connection() as conn:
        c = conn.cursor()
        # Users table
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                name TEXT,
                bio TEXT,
                avatar_url TEXT,
                html_url TEXT,
                company TEXT,
                location TEXT,
                followers INTEGER,
                following INTEGER,
                public_repos INTEGER,
                public_gists INTEGER,
                created_at TEXT,
                updated_at TEXT
            );
        ''')
        # Analysis results table
        c.execute('''
            CREATE TABLE IF NOT EXISTS analysis_results (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                hire_score REAL,
                hmm_state TEXT,
                hmm_confidence REAL,
                hmm_momentum REAL,
                hmm_stability REAL,
                hmm_decline_risk REAL,
                analysis_time TEXT
            );
        ''')
        # Commit classifications table
        c.execute('''
            CREATE TABLE IF NOT EXISTS commit_classifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                repo_name TEXT,
                commit_sha TEXT,
                message TEXT,
                tag TEXT,
                intent TEXT,
                sentiment TEXT,
                intent_score REAL
            );
        ''')
        conn.commit()

def insert_user(user: Dict[str, Any]) -> int:
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('''
            INSERT INTO users (username, name, bio, avatar_url, html_url, company, location, followers, following, public_repos, public_gists, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING
        ''', (
            user["login"], user.get("name"), user.get("bio"), user.get("avatar_url"), user.get("html_url"),
            user.get("company"), user.get("location"), user.get("followers", 0), user.get("following", 0),
            user.get("public_repos", 0), user.get("public_gists", 0), user.get("created_at"), user.get("updated_at")
        ))
        conn.commit()
        c.execute('SELECT id FROM users WHERE username = %s', (user["login"],))
        return c.fetchone()["id"]

def insert_analysis_result(user_id: int, result: Dict[str, Any]):
    diagnostics = result.get("analytics", {}).get("hmm_diagnostics", {}) if isinstance(result.get("analytics"), dict) else {}
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('''
            INSERT INTO analysis_results (user_id, hire_score, hmm_state, hmm_confidence, hmm_momentum, hmm_stability, hmm_decline_risk, analysis_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            user_id,
            result.get("hire_score"),
            result.get("state"),
            diagnostics.get("confidence"),
            diagnostics.get("momentum"),
            diagnostics.get("stability"),
            diagnostics.get("decline_risk"),
            datetime.now(timezone.utc).isoformat(),
        ))
        conn.commit()

def insert_commit_classification(user_id: int, commit: Dict[str, Any]):
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('''
            INSERT INTO commit_classifications (user_id, repo_name, commit_sha, message, tag, intent, sentiment, intent_score)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            user_id, commit.get("repo_name"), commit.get("commit_sha"), commit.get("message"),
            commit.get("tag"), commit.get("intent"), commit.get("sentiment"), commit.get("intent_score")
        ))
        conn.commit()

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE username = %s', (username,))
        row = c.fetchone()
        return dict(row) if row else None
