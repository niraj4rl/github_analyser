import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { AnalysisResult } from '@/types'
import { Sidebar } from '@/components/Sidebar'
import { OverviewPage } from './pages/OverviewPage'
import { ActivityPage } from './pages/ActivityPage'
import { RepositoriesPage } from './pages/RepositoriesPage'
import { LanguagesPage } from './pages/LanguagesPage'
import { InsightsPage } from './pages/InsightsPage'

export function DashboardLayout() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePage, setActivePage] = useState('overview')

  useEffect(() => {
    if (!username) return

    const loadAnalysis = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await api.analyzeUser(username)
        setAnalysis(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis')
      } finally {
        setLoading(false)
      }
    }

    loadAnalysis()
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.12em] text-muted">Preparing Dashboard</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">Analyzing {username}</h2>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-2 rounded-full bg-card-soft overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-primary/30 via-primary to-primary/30 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 rounded-lg bg-card-soft animate-pulse"></div>
              <div className="h-12 rounded-lg bg-card-soft animate-pulse [animation-delay:120ms]"></div>
              <div className="h-12 rounded-lg bg-card-soft animate-pulse [animation-delay:240ms]"></div>
            </div>
          </div>

          <p className="text-sm text-muted mt-5">Fetching repositories, contribution timeline, and quality signals. This usually takes a few seconds.</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-danger mb-4">{error || 'Failed to load user analysis'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (activePage) {
      case 'activity':
        return <ActivityPage analysis={analysis} />
      case 'repos':
        return <RepositoriesPage analysis={analysis} />
      case 'languages':
        return <LanguagesPage analysis={analysis} />
      case 'insights':
        return <InsightsPage analysis={analysis} />
      default:
        return <OverviewPage analysis={analysis} />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <img
                src={analysis.profile.avatar_url || `https://github.com/${analysis.profile.login}.png?size=32`}
                alt={analysis.profile.login}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-foreground font-medium">{analysis.profile.login}</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
