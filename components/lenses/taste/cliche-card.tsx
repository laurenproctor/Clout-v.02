'use client'

import type { ClichePattern } from '@/lib/lenses/taste/tasteTypes'

interface ClicheCardProps {
  pattern: ClichePattern
}

function severityTier(severity: number): 'high' | 'medium' | 'low' {
  if (severity >= 0.7) return 'high'
  if (severity >= 0.45) return 'medium'
  return 'low'
}

export function ClicheCard({ pattern }: ClicheCardProps) {
  const tier = severityTier(pattern.severity)

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">"{pattern.phrase}"</p>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{tier}</span>
      </div>

      <div className="w-full bg-muted rounded-full h-px">
        <div
          className="bg-foreground h-px rounded-full transition-all"
          style={{ width: `${pattern.severity * 100}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground">{pattern.reasonWeak}</p>

      {pattern.replacementStrategy && (
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approach</p>
          <p className="text-sm text-muted-foreground">{pattern.replacementStrategy}</p>
        </div>
      )}
    </div>
  )
}
