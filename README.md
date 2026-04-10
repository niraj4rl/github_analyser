# Intelligent Developer Hiring & Analytics System

FastAPI + GitHub API + ML + HMM dashboard for developer hiring analytics.

## Features

- GitHub profile, repository, language, and commit analysis
- Hire score prediction with a learned regression model
- HMM-based state detection for developer trajectory
- NLP commit classification for feature, bugfix, refactor, and low-value commits
- Interactive dark analytics dashboard with charts

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and add an optional `GITHUB_TOKEN`.
4. Build the React frontend:
   ```bash
   npm install
   npm run build
   ```
5. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```
6. Open `http://127.0.0.1:8000`.

## API

- `POST /analyze-user` with `{ "username": "octocat" }`
