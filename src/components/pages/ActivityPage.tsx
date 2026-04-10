import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { AnalysisResult } from '@/types'

export function ActivityPage({ analysis }: { analysis: AnalysisResult }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

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
        },
        scales: {
          y: {
            ticks: { color: '#8b949e' },
            border: { color: '#30363d' },
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
        <div className="h-96">
          <canvas ref={chartRef}></canvas>
        </div>
        <div className="mt-6 p-4 bg-card-soft rounded-lg">
          <div className="text-sm text-muted">Total Commits</div>
          <div className="text-3xl font-bold text-foreground">{analysis.activity.total_commits}</div>
        </div>
      </div>

      {analysis.hidden_states && analysis.hidden_states.length > 0 && (
        <div className="glass-panel rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Hidden State Distribution</h3>
          <div className="space-y-3">
            {analysis.hidden_states.map((hs, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-2">
                  <span className="text-foreground">{hs.state}</span>
                  <span className="text-muted">{(hs.probability * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-card-soft rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${hs.probability * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
