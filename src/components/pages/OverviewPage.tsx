import { AnalysisResult } from '@/types'

export function OverviewPage({ analysis }: { analysis: AnalysisResult }) {
  const visibleInsights = analysis.insights.filter(
    (insight) => !/\bhmm\b|hidden-state|state trajectory/i.test(insight),
  )
  const collaboratedCount = analysis.repositories.filter((repo) => repo.isCollaborated).length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-panel rounded-lg p-8 mb-8 border border-white/14 bg-black/85">
        <div className="flex flex-col md:flex-row gap-8">
          <img
            src={analysis.profile.avatar_url || `https://github.com/${analysis.profile.login}.png?size=160`}
            alt={analysis.profile.login}
            className="w-32 h-32 rounded-lg"
          />
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{analysis.profile.name || analysis.profile.login}</h1>
            {analysis.profile.bio && <p className="text-muted mb-4">{analysis.profile.bio}</p>}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted">Repos</div>
                <div className="text-2xl font-bold text-foreground">{analysis.profile.public_repos}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Followers</div>
                <div className="text-2xl font-bold text-foreground">{analysis.profile.followers}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Following</div>
                <div className="text-2xl font-bold text-foreground">{analysis.profile.following}</div>
              </div>
            </div>
            <a
              href={`https://github.com/${analysis.profile.login}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-white hover:bg-white/90 text-black rounded-lg transition-colors border border-white"
            >
              Open GitHub Profile
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-lg p-6 border border-white/12 bg-black/85">
          <div className="text-sm text-muted mb-2">Hire Score</div>
          <div className="text-5xl font-bold text-white mb-4">{analysis.hire_score.toFixed(1)}</div>
          <div className="text-sm">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              analysis.recommendation === 'Strong Hire'
                ? 'bg-white/16 text-foreground'
                : analysis.recommendation === 'Hire'
                ? 'bg-white/14 text-foreground'
                : 'bg-white/10 text-muted'
            }`}>
              {analysis.recommendation}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-6 border border-white/12 bg-black/85">
          <div className="text-sm text-muted mb-2">Development Trajectory</div>
          <div className="text-lg font-semibold text-foreground mb-4">{analysis.state}</div>
          <div className="text-sm">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/14 text-foreground">
              {analysis.trend}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-6 border border-white/12 bg-black/85">
          <div className="text-sm text-muted mb-4">Total Commits</div>
          <div className="text-3xl font-bold text-white">{analysis.activity.total_commits}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="glass-panel rounded-lg p-5 border border-white/12 bg-black/85">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">Repositories Analyzed</div>
          <div className="text-2xl font-semibold text-foreground">{analysis.repositories.length}</div>
        </div>
        <div className="glass-panel rounded-lg p-5 border border-white/12 bg-black/85">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">Language Coverage</div>
          <div className="text-2xl font-semibold text-foreground">{analysis.languages.length}</div>
        </div>
        <div className="glass-panel rounded-lg p-5 border border-white/12 bg-black/85">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">Collaborated Repos</div>
          <div className="text-2xl font-semibold text-foreground">{collaboratedCount}</div>
        </div>
        <div className="glass-panel rounded-lg p-5 border border-white/12 bg-black/85">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">Risk Flags</div>
          <div className="text-2xl font-semibold text-foreground">{analysis.risks.length}</div>
        </div>
      </div>

      <div className="glass-panel rounded-lg p-6 mt-6 border border-white/12 bg-black/85">
        <h3 className="text-lg font-semibold text-foreground mb-4">Insights</h3>
        <div className="space-y-3">
          {visibleInsights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="text-foreground/80 mt-1">→</div>
              <p className="text-muted">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
