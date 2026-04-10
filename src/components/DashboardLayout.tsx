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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p className="text-muted">Loading analysis for {username}...</p>
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
