'use client'

import type { SecondOrderEffect } from '@/lib/lenses/contrarian/contrarianTypes'

const TIMEFRAME_LABELS: Record<SecondOrderEffect['timeframe'], string> = {
  immediate: 'Immediate',
  medium_term: 'Medium term',
  long_term: 'Long term',
}

interface AsymmetryCardProps {
  effect: SecondOrderEffect
}

export function AsymmetryCard({ effect }: AsymmetryCardProps) {
  return (
    <div className="border border-border rounded-sm p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {TIMEFRAME_LABELS[effect.timeframe]}
        </span>
      </div>
      <p className="text-sm font-medium">{effect.effect}</p>
      <p className="text-sm text-muted-foreground">{effect.explanation}</p>
    </div>
  )
}
