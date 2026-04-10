import { AnalysisResult } from '@/types'
import { Star, Code } from 'lucide-react'

export function RepositoriesPage({ analysis }: { analysis: AnalysisResult }) {
  const formatDate = (value?: string) => {
    if (!value) return 'Unknown'
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Repositories</h2>
      <div className="grid gap-4">
        {analysis.repositories.map((repo) => (
          <a
            key={repo.fullName}
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="glass-panel rounded-lg p-6 hover:bg-card-soft transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-primary hover:underline">{repo.name}</h3>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      repo.isCollaborated
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {repo.isCollaborated ? 'Collaborated' : 'Owned'}
                  </span>
                  {repo.isCollaborated && repo.ownerLogin && (
                    <span className="text-xs text-muted">Owner: {repo.ownerLogin}</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3 line-clamp-2">
                  {repo.description || 'No description provided.'}
                </p>
                {repo.language && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Code className="w-4 h-4" />
                    {repo.language}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>Forks: {repo.forks ?? 0}</span>
                  <span>Open issues: {repo.openIssues ?? 0}</span>
                  <span>Updated: {formatDate(repo.updatedAt)}</span>
                </div>
              </div>
              {repo.stars > 0 && (
                <div className="flex items-center gap-1 text-accent">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">{repo.stars}</span>
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
