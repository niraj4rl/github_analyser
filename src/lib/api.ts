import { AnalysisResult, SearchResult } from '@/types'

const API_BASE = import.meta.env.DEV ? '/api' : ''

type RawAnalysisResponse = {
  profile: AnalysisResult['profile']
  state: string
  recommendation: string
  hire_score: number
  trend: string
  insights: string[]
  risks: string[]
  analytics: {
    commits_per_week: number[]
    languages: Record<string, number>
    repo_stats: Array<{
      name: string
      html_url: string
      stars: number
      language: string | null
      description?: string | null
      forks?: number
      open_issues?: number
      updated_at?: string | null
    }>
    hidden_state_probabilities: Record<string, number>
  }
}

function normalizeAnalysis(payload: RawAnalysisResponse): AnalysisResult {
  const weekly = payload.analytics?.commits_per_week ?? []
  const totalCommits = weekly.reduce((sum, count) => sum + count, 0)

  return {
    profile: payload.profile,
    state: payload.state,
    recommendation: payload.recommendation,
    hire_score: payload.hire_score,
    trend: payload.trend,
    insights: payload.insights ?? [],
    risks: payload.risks ?? [],
    activity: {
      commits_per_week: weekly.map((count, index) => ({ week: index + 1, count })),
      total_commits: totalCommits,
    },
    repositories: (payload.analytics?.repo_stats ?? []).map((repo) => ({
      name: repo.name,
      url: repo.html_url,
      stars: repo.stars ?? 0,
      language: repo.language ?? 'Unknown',
      description: repo.description ?? undefined,
      forks: repo.forks ?? 0,
      openIssues: repo.open_issues ?? 0,
      updatedAt: repo.updated_at ?? undefined,
    })),
    languages: Object.entries(payload.analytics?.languages ?? {}).map(([name, percentage]) => ({
      name,
      percentage,
    })),
    hidden_states: Object.entries(payload.analytics?.hidden_state_probabilities ?? {}).map(([state, probability]) => ({
      state,
      probability,
    })),
  }
}

export const api = {
  async searchUsers(query: string): Promise<SearchResult> {
    const response = await fetch(`${API_BASE}/search-users?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error('Search failed')
    return response.json()
  },

  async analyzeUser(username: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE}/analyze-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (!response.ok) throw new Error('Analysis failed')
    const payload = (await response.json()) as RawAnalysisResponse
    return normalizeAnalysis(payload)
  },

  async health(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE}/health`)
    if (!response.ok) throw new Error('Health check failed')
    return response.json()
  },
}
