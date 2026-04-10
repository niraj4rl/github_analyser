import { Home, TrendingUp, Code2, Zap, Lightbulb } from 'lucide-react'

interface SidebarProps {
  activePage: string
  onPageChange: (page: string) => void
}

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const pages = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'activity', label: 'Activity', icon: TrendingUp },
    { id: 'repos', label: 'Repositories', icon: Code2 },
    { id: 'languages', label: 'Languages', icon: Zap },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
  ]

  return (
    <aside className="w-68 border-r border-border bg-card-soft sticky top-0 h-screen overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold">GH</div>
          <div>
            <div className="text-xs text-muted">Hiring</div>
            <div className="text-sm font-semibold text-foreground">Analytics</div>
          </div>
        </div>

        <nav className="space-y-2">
          {pages.map((page) => {
            const Icon = page.icon
            return (
              <button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  activePage === page.id
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{page.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
