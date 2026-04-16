import { useMemo } from 'react'
import { AnalysisResult } from '@/types'

export function ActivityPage({ analysis }: { analysis: AnalysisResult }) {
  const weekly = analysis.activity.commits_per_week
  const weeklyCounts = weekly.map((item) => item.count)
  const totalWeeks = weeklyCounts.length
  const totalCommits = analysis.activity.total_commits
  const activeWeeks = weeklyCounts.filter((count) => count > 0).length
  const averagePerWeek = totalWeeks > 0 ? totalCommits / totalWeeks : 0
  const peakCommits = weeklyCounts.length > 0 ? Math.max(...weeklyCounts) : 0
  const peakWeekIndex = weeklyCounts.findIndex((count) => count === peakCommits)
  const last12 = weeklyCounts.slice(-12)
  const previous12 = weeklyCounts.slice(-24, -12)
  const recent12Total = last12.reduce((sum, count) => sum + count, 0)
  const previous12Total = previous12.reduce((sum, count) => sum + count, 0)
  const trendDelta = recent12Total - previous12Total

  const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const monthLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

  const toKey = (date: Date) => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const heatmap = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const start = analysis.profile.created_at ? new Date(analysis.profile.created_at) : new Date(today)
    start.setHours(0, 0, 0, 0)

    const gridStart = new Date(start)
    gridStart.setDate(gridStart.getDate() - gridStart.getDay())

    const countsByDate = new Map<string, number>(
      (analysis.activity.daily_heatmap ?? []).map((item) => [item.date, item.count]),
    )

    const weeks: Array<Array<{ date: Date; count: number; level: number }>> = []
    const monthLabels: string[] = []
    let maxCount = 0

    for (let cursor = new Date(gridStart); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
      const day = new Date(cursor)
      const weekIndex = Math.floor((day.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (!weeks[weekIndex]) {
        weeks[weekIndex] = []
        if (weekIndex === 0) {
          monthLabels[weekIndex] = monthLabelFormatter.format(day)
        } else {
          const prevWeekFirst = weeks[weekIndex - 1]?.[0]?.date
          monthLabels[weekIndex] = prevWeekFirst && prevWeekFirst.getMonth() === day.getMonth() ? '' : monthLabelFormatter.format(day)
        }
      }

      const count = countsByDate.get(toKey(day)) ?? 0
      maxCount = Math.max(maxCount, count)
      weeks[weekIndex].push({ date: day, count, level: 0 })
    }

    for (const week of weeks) {
      for (const day of week) {
        if (day.count <= 0 || maxCount <= 0) {
          day.level = 0
          continue
        }
        const ratio = day.count / maxCount
        day.level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1
      }
    }

    return { weeks, monthLabels }
  }, [analysis.activity.daily_heatmap, analysis.profile.created_at])

  let currentStreak = 0
  for (let index = weeklyCounts.length - 1; index >= 0; index -= 1) {
    if (weeklyCounts[index] <= 0) break
    currentStreak += 1
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-panel rounded-lg p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Activity Analytics</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-card-soft p-4">
            <div className="text-xs text-muted">Active Weeks</div>
            <div className="text-2xl font-semibold text-foreground">{activeWeeks}</div>
          </div>
          <div className="rounded-lg border border-border bg-card-soft p-4">
            <div className="text-xs text-muted">Avg / Week</div>
            <div className="text-2xl font-semibold text-foreground">{averagePerWeek.toFixed(1)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card-soft p-4">
            <div className="text-xs text-muted">Peak Week</div>
            <div className="text-2xl font-semibold text-foreground">{peakCommits}</div>
            {peakWeekIndex >= 0 && <div className="text-xs text-muted mt-1">Week {peakWeekIndex + 1}</div>}
          </div>
          <div className="rounded-lg border border-border bg-card-soft p-4">
            <div className="text-xs text-muted">Current Streak</div>
            <div className="text-2xl font-semibold text-foreground">{currentStreak}w</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card-soft p-4 overflow-x-auto">
          <div className="flex items-start gap-3 min-w-max">
            <div className="mt-6 space-y-1 text-[10px] text-muted">
              <div>Sun</div>
              <div className="pt-3">Tue</div>
              <div className="pt-3">Thu</div>
              <div className="pt-3">Sat</div>
            </div>

            <div>
              <div className="flex gap-1 mb-2 h-4 text-[10px] text-muted">
                {heatmap.monthLabels.map((label, index) => (
                  <div key={`month-${index}`} className="w-3 text-center leading-4">
                    {label}
                  </div>
                ))}
              </div>

              <div className="flex gap-1">
                {heatmap.weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const day = week[dayIndex]
                      const levelClass =
                        !day || day.level === 0
                          ? 'bg-[#1b2230]'
                          : day.level === 1
                          ? 'bg-[#2a303c]'
                          : day.level === 2
                          ? 'bg-[#39404f]'
                          : day.level === 3
                          ? 'bg-[#495265]'
                          : 'bg-[#5d667a]'

                      const tooltip = day
                        ? `${tooltipDateFormatter.format(day.date)} - ${day.count} commit${day.count === 1 ? '' : 's'}`
                        : ''

                      return (
                        <div
                          key={`day-${weekIndex}-${dayIndex}`}
                          title={tooltip}
                          className={`h-3 w-3 rounded-[3px] border border-white/5 ${levelClass}`}
                        ></div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted">
            <span>Less</span>
            <div className="h-3 w-3 rounded-[3px] border border-white/5 bg-[#1b2230]"></div>
            <div className="h-3 w-3 rounded-[3px] border border-white/5 bg-[#2a303c]"></div>
            <div className="h-3 w-3 rounded-[3px] border border-white/5 bg-[#39404f]"></div>
            <div className="h-3 w-3 rounded-[3px] border border-white/5 bg-[#495265]"></div>
            <div className="h-3 w-3 rounded-[3px] border border-white/5 bg-[#5d667a]"></div>
            <span>More</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-card-soft rounded-lg border border-border">
            <div className="text-sm text-muted">Total Commits</div>
            <div className="text-3xl font-bold text-foreground">{analysis.activity.total_commits}</div>
          </div>
          <div className="p-4 bg-card-soft rounded-lg border border-border">
            <div className="text-sm text-muted">Last 12 Weeks vs Previous 12</div>
            <div className={`text-3xl font-bold ${trendDelta >= 0 ? 'text-foreground' : 'text-muted'}`}>
              {trendDelta >= 0 ? '+' : ''}{trendDelta}
            </div>
            <div className="text-xs text-muted mt-1">
              Recent: {recent12Total} commits | Previous: {previous12Total}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-card-soft rounded-lg border border-border">
          <div className="text-sm font-medium text-foreground mb-2">Activity Insights</div>
          <ul className="space-y-1 text-sm text-muted">
            <li>{activeWeeks > totalWeeks * 0.7 ? 'Consistent weekly output across most of the timeline.' : 'Activity is concentrated in specific periods.'}</li>
            <li>{trendDelta >= 0 ? 'Recent momentum is improving compared to the prior quarter.' : 'Recent momentum softened relative to the prior quarter.'}</li>
            <li>{currentStreak >= 4 ? 'Current contribution streak indicates sustained recent delivery.' : 'Recent streak is short; cadence may be uneven.'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
