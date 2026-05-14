'use client'

import type { WeakSignal } from '@/lib/lenses/signal/signalTypes'

const SOURCE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  economic: 'Economic',
  cultural: 'Cultural',
  technological: 'Technological',
  regulatory: 'Regulatory',
  organizational: 'Organizational',
}

const MATURITY_LABELS: Record<string, string> = {
  fragmented: 'Fragmented',
  emerging: 'Emerging',
  consolidating: 'Consolidating',
  institutionalized: 'Institutionalized',
}

interface WeakSignalCardProps {
  signal: WeakSignal
}

export function WeakSignalCard({ signal }: WeakSignalCardProps) {
  if (signal.confidence < 0.4) return null

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-sm">
            {SOURCE_LABELS[signal.sourceType] ?? signal.sourceType}
          </span>
          <span className="text-xs text-muted-foreground">
            {MATURITY_LABELS[signal.maturity] ?? signal.maturity}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(signal.confidence * 100)}% confidence
        </span>
      </div>

      <p className="text-sm font-medium">{signal.signal}</p>
      <p className="text-sm text-muted-foreground">{signal.whyItMatters}</p>

      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground shrink-0">Momentum</p>
        <div className="flex-1 bg-muted rounded-full h-px">
          <div
            className="bg-foreground h-px rounded-full transition-all"
            style={{ width: `${signal.momentum * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {Math.round(signal.momentum * 100)}%
        </p>
      </div>
    </div>
  )
}
