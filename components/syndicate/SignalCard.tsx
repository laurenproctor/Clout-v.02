'use client'

import { cn } from '@/lib/utils'
import type { ContentSignal } from '@/lib/syndicate/types/signals'

interface SignalCardProps {
  signal: ContentSignal
}

function StrengthBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-0.5 w-16 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-zinc-400 transition-all"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function SignalCard({ signal }: SignalCardProps) {
  const isSpeculative = signal.confidence < 0.55

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 space-y-3',
        isSpeculative ? 'border-zinc-100 opacity-75' : 'border-zinc-200',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-0.5">
            {signal.category.replace(/_/g, ' ')}
          </p>
          <p className="text-sm font-medium text-zinc-900 leading-snug">{signal.label}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-xs tabular-nums', isSpeculative ? 'text-zinc-300' : 'text-zinc-400')}>
            {Math.round(signal.confidence * 100)}%
          </span>
          <StrengthBar value={signal.strength} />
        </div>
      </div>

      {/* Observation — factual, what structurally occurs */}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Observation</p>
        <p className="text-sm text-zinc-700 leading-relaxed">{signal.observation}</p>
      </div>

      {/* Interpretation — causal, why it matters */}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Interpretation</p>
        <p className="text-sm text-zinc-600 leading-relaxed">{signal.interpretation}</p>
      </div>

      {/* Evidence quotes */}
      {signal.evidence.length > 0 && (
        <div className="space-y-1.5 border-t border-zinc-100 pt-3">
          {signal.evidence.slice(0, 2).map((ev, i) => (
            <blockquote key={i} className="border-l-2 border-zinc-200 pl-3">
              <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-3">
                &ldquo;{ev.quote}&rdquo;
              </p>
              {ev.section && (
                <p className="text-xs text-zinc-300 mt-0.5">— {ev.section}</p>
              )}
            </blockquote>
          ))}
        </div>
      )}

      {isSpeculative && (
        <p className="text-xs text-zinc-300 italic">Low confidence — interpret speculatively</p>
      )}
    </div>
  )
}
