'use client'

import type { FutureImplication } from '@/lib/lenses/signal/signalTypes'

const TIMEFRAME_LABELS: Record<FutureImplication['timeframe'], string> = {
  short_term: 'Short term',
  medium_term: 'Medium term',
  long_term: 'Long term',
}

interface ImplicationCardProps {
  implication: FutureImplication
}

export function ImplicationCard({ implication }: ImplicationCardProps) {
  return (
    <div className="border border-border rounded-sm p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {TIMEFRAME_LABELS[implication.timeframe]}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round(implication.likelihood * 100)}% likelihood
        </span>
      </div>
      <p className="text-sm">{implication.implication}</p>
    </div>
  )
}
