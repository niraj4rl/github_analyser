import { AnalysisResult } from '@/types'
import { AlertCircle } from 'lucide-react'

export function InsightsPage({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Insights & Risks</h2>

      <div className="glass-panel rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Key Insights</h3>
        <div className="space-y-3">
          {analysis.insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="text-foreground/80 mt-1">→</div>
              <p className="text-foreground">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {analysis.risks && analysis.risks.length > 0 && (
        <div className="glass-panel rounded-lg p-6 border-l-2 border-white/20">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Risk Assessment
          </h3>
          <div className="space-y-3">
            {analysis.risks.map((risk, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-white/55 mt-2"></div>
                <p className="text-foreground">{risk}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
