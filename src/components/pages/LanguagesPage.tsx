import { useEffect, useMemo, useRef } from 'react'
import Chart from 'chart.js/auto'
import { AnalysisResult } from '@/types'

const CHART_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#f472b6', '#c084fc']

export function LanguagesPage({ analysis }: { analysis: AnalysisResult }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  const sortedLanguages = useMemo(
    () => [...analysis.languages].sort((a, b) => b.percentage - a.percentage),
    [analysis.languages]
  )

  useEffect(() => {
    if (!chartRef.current || sortedLanguages.length === 0) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sortedLanguages.map((lang) => lang.name),
        datasets: [
          {
            data: sortedLanguages.map((lang) => Number(lang.percentage.toFixed(2))),
            backgroundColor: sortedLanguages.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
            borderColor: '#0d1117',
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%`,
            },
          },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [sortedLanguages])

  if (sortedLanguages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Languages</h2>
        <div className="glass-panel rounded-lg p-6 text-muted">No language data available for this profile.</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Languages</h2>
      <div className="glass-panel rounded-lg p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="h-[320px] md:h-[360px]">
            <canvas ref={chartRef}></canvas>
          </div>

          <div className="space-y-3">
            {sortedLanguages.map((lang, index) => (
              <div key={lang.name} className="flex items-center justify-between rounded-lg border border-border bg-card-soft/40 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  ></span>
                  <span className="text-foreground truncate">{lang.name}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{lang.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
