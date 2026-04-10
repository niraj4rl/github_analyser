export interface User {
  login: string
  name?: string
  bio?: string
  avatar_url?: string
  public_repos?: number
  followers?: number
  following?: number
}

export interface AnalysisResult {
  profile: User
  state: string
  recommendation: string
  hire_score: number
  trend: string
  insights: string[]
  activity: {
    commits_per_week: Array<{ week: number; count: number }>
    total_commits: number
  }
  repositories: Array<{
    name: string
    url: string
    stars: number
    language: string
    description?: string
    forks?: number
    openIssues?: number
    updatedAt?: string
  }>
  languages: Array<{ name: string; percentage: number }>
  risks: string[]
  hidden_states: Array<{ state: string; probability: number }>
}

export interface SearchResult {
  results: User[]
}
