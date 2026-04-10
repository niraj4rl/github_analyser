import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { AnalysisResult } from '@/types'

export function ActivityPage({ analysis }: { analysis: AnalysisResult }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
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

  let currentStreak = 0
  for (let index = weeklyCounts.length - 1; index >= 0; index -= 1) {
    if (weeklyCounts[index] <= 0) break
    currentStreak += 1
  }

  const movingAverage = weeklyCounts.map((_, index, values) => {
    const start = Math.max(0, index - 3)
    const window = values.slice(start, index + 1)
    const average = window.reduce((sum, value) => sum + value, 0) / window.length
    return Number(average.toFixed(2))
  })

  useEffect(() => {
    if (!chartRef.current || !analysis.activity.commits_per_week) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: analysis.activity.commits_per_week.map((d) => `Week ${d.week}`),
        datasets: [
          {
            label: 'Commits',
            data: analysis.activity.commits_per_week.map((d) => d.count),
            borderColor: '#1f6feb',
            backgroundColor: 'rgba(31, 111, 235, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 1.5,
            pointHoverRadius: 4,
          },
          {
            label: '4-week moving average',
            data: movingAverage,
            borderColor: '#2ea043',
            backgroundColor: 'transparent',
            tension: 0.25,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#c9d1d9' },
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
            },
          },
        },
        scales: {
          y: {
            ticks: { color: '#8b949e' },
            border: { color: '#30363d' },
            beginAtZero: true,
          },
          x: {
            ticks: { color: '#8b949e' },
            border: { color: '#30363d' },
          },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [analysis])

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

        <div className="h-96">
          <canvas ref={chartRef}></canvas>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-card-soft rounded-lg border border-border">
            <div className="text-sm text-muted">Total Commits</div>
            <div className="text-3xl font-bold text-foreground">{analysis.activity.total_commits}</div>
          </div>
          <div className="p-4 bg-card-soft rounded-lg border border-border">
            <div className="text-sm text-muted">Last 12 Weeks vs Previous 12</div>
            <div className={`text-3xl font-bold ${trendDelta >= 0 ? 'text-accent' : 'text-warning'}`}>
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
