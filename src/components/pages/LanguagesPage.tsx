import { useEffect, useMemo, useRef } from 'react'
import Chart from 'chart.js/auto'
import { AnalysisResult } from '@/types'

const CHART_COLORS = ['#d7dce4', '#c0c6d1', '#aeb5c2', '#9ba4b3', '#8993a5', '#778296', '#646f84', '#515c72']

type LanguageSlice = {
  name: string
  percentage: number
}

const MAX_VISIBLE_LANGUAGES = 6

function buildChartLanguages(languages: LanguageSlice[]) {
  const visible = languages.slice(0, MAX_VISIBLE_LANGUAGES)
  const hidden = languages.slice(MAX_VISIBLE_LANGUAGES)
  const otherPercentage = hidden.reduce((sum, lang) => sum + lang.percentage, 0)

  if (otherPercentage <= 0) {
    return visible
  }

  return [
    ...visible,
    {
      name: 'Other',
      percentage: Number(otherPercentage.toFixed(2)),
    },
  ]
}

export function LanguagesPage({ analysis }: { analysis: AnalysisResult }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  const sortedLanguages = useMemo(
    () => [...analysis.languages].sort((a, b) => b.percentage - a.percentage),
    [analysis.languages]
  )

  const chartLanguages = useMemo(() => buildChartLanguages(sortedLanguages), [sortedLanguages])
  const dominantLanguage = chartLanguages[0]

  useEffect(() => {
    if (!chartRef.current || chartLanguages.length === 0) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartLanguages.map((lang) => lang.name),
        datasets: [
          {
            data: chartLanguages.map((lang) => Number(lang.percentage.toFixed(2))),
            backgroundColor: chartLanguages.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
            borderColor: '#06080d',
            borderWidth: 3,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
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
  }, [chartLanguages])

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
      <div className="glass-panel rounded-lg p-6 md:p-8 border border-white/12 bg-black/85">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="relative h-[320px] md:h-[360px]">
            <canvas ref={chartRef}></canvas>
            {dominantLanguage && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Top language</div>
                  <div className="text-2xl font-semibold text-white mt-2">{dominantLanguage.name}</div>
                  <div className="text-sm text-muted mt-1">{dominantLanguage.percentage.toFixed(1)}% of analyzed code</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Summary</div>
              <div className="text-sm text-foreground mt-2">
                {chartLanguages.length} visible slices from {sortedLanguages.length} languages.
              </div>
            </div>

            {chartLanguages.map((lang, index) => (
              <div key={lang.name} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    ></span>
                    <span className="text-foreground truncate">{lang.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{lang.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(lang.percentage, 2)}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
