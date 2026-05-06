'use client'

import type { TensionPoint } from '@/lib/lenses/contrarian/contrarianTypes'

interface TensionCardProps {
  tension: TensionPoint
}

export function TensionCard({ tension }: TensionCardProps) {
  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <p className="text-sm font-medium">{tension.tension}</p>
      <p className="text-sm text-muted-foreground">{tension.whyItCreatesDistinction}</p>
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">Resistance likelihood</p>
        <div className="flex-1 bg-muted rounded-full h-px">
          <div
            className="bg-foreground h-px rounded-full transition-all"
            style={{ width: `${tension.resistanceLikelihood * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {Math.round(tension.resistanceLikelihood * 100)}%
        </p>
      </div>
    </div>
  )
}
