
# GitInsight: Intelligent Developer Hiring & Analytics System

GitInsight is a modern, full-stack analytics platform designed to help recruiters, engineering managers, and developers gain deep insights into GitHub activity and developer potential. It combines FastAPI, the GitHub API, advanced machine learning, and a beautiful React dashboard to deliver actionable analytics for hiring and team building.

## Project Overview

**GitInsight** analyzes GitHub profiles, repositories, and commit histories to:
- Predict developer hire scores using a custom ML regression model
- Detect developer trajectory and activity patterns with Hidden Markov Models (HMM)
- Classify commits (feature, bugfix, refactor, low-value) using NLP
- Visualize languages, repositories, and activity heatmaps in an interactive dashboard

The platform is built for extensibility and can be adapted for both individual and organizational analytics.


## Features

- Deep GitHub profile, repository, language, and commit analysis
- Hire score prediction with a learned regression model
- HMM-based state detection for developer trajectory
- NLP commit classification for feature, bugfix, refactor, and low-value commits
- Interactive, dark-themed analytics dashboard with charts and visualizations
- Search and analyze any public GitHub user
- Modern UI/UX with React, Tailwind CSS, and Vite


## Tech Stack

- **Backend:** FastAPI (Python), Uvicorn, Pydantic
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **ML/NLP:** Custom regression models, HMM, commit classification
- **APIs:** GitHub REST API

## Architecture

```
┌────────────┐      REST API      ┌──────────────┐      ┌──────────────┐
│  Frontend  │ <───────────────> │   FastAPI    │ <───> │  GitHub API  │
│  (React)   │                   │   Backend    │      │  + ML/NLP    │
└────────────┘                   └──────────────┘      └──────────────┘
```
## Outputs
<img width="1919" height="1079" alt="Screenshot 2026-04-22 180141" src="https://github.com/user-attachments/assets/569bec6b-b541-4219-a9c3-f442222bc603" />



## Getting Started (Local Development)

1. **Clone the repository**
2. Create and activate a Python virtual environment
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and add your `GITHUB_TOKEN` (optional, for higher API rate limits)
5. Build the frontend:
   ```bash
   npm install
   npm run build
   ```
6. Start the backend server (ensure the port matches Vite proxy, default is 8010):
   ```bash
   uvicorn app.main:app --reload --port 8010
   ```
7. Start the frontend (for development):
   ```bash
   npm run dev
   ```
8. Open `http://localhost:5173` in your browser

## API Endpoints

- `POST /analyze-user` with `{ "username": "octocat" }` — Analyze a GitHub user
- `GET /search-users?q=...` — Search for GitHub users
- `GET /health` — Health check

## Deployment

This project is currently in local development and not yet deployed. If you’d like a demo or want to contribute, please connect or check out the repository!

## Screenshots

_Add screenshots or GIFs of the dashboard here._

## License

MIT License

## API

- `POST /analyze-user` with `{ "username": "octocat" }`
