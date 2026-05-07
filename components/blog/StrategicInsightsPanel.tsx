'use client'

import type { StrategicInsights } from '@/lib/blog/types'

interface StrategicInsightsPanelProps {
  insights: StrategicInsights
}

export function StrategicInsightsPanel({ insights }: StrategicInsightsPanelProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Strategic Insights
      </h3>
      <div className="space-y-4">
        <InsightRow label="Differentiation Angle" value={insights.differentiationAngle} />
        <InsightRow label="Audience Tension" value={insights.audienceTension} />
        <InsightRow label="Dominant Lens" value={insights.dominantLensInfluence} />

        {insights.expectedStrengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">Expected Strengths</p>
            <ul className="space-y-1">
              {insights.expectedStrengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                  <span className="mt-0.5 text-emerald-500 shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.expectedWeaknesses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">Watch For</p>
            <ul className="space-y-1">
              {insights.expectedWeaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                  <span className="mt-0.5 text-zinc-400 shrink-0">−</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.alternativeAngles.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">Alternative Angles</p>
            <ul className="space-y-1">
              {insights.alternativeAngles.map((a, i) => (
                <li key={i} className="text-xs text-zinc-500 italic">{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-0.5">{label}</p>
      <p className="text-xs text-zinc-700">{value}</p>
    </div>
  )
}
