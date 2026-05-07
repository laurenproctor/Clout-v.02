'use client'

import { cn } from '@/lib/utils'

interface ProgressEvent {
  phase: string
  label: string
}

interface GenerationProgressProps {
  events: ProgressEvent[]
  state: string
}

const PHASE_ORDER = [
  'narrative-strategy',
  'hook-exploration',
  'continue',
  'metadata',
  'outline',
  'sections',
  'image-specs',
  'distribution',
  'content-analysis',
]

export function GenerationProgress({ events, state }: GenerationProgressProps) {
  const isComplete = state === 'result'
  const isPaused = state === 'narrative-review'

  const lastEvent = events[events.length - 1]

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        {isPaused ? (
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
        ) : isComplete ? (
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        ) : (
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-400 animate-pulse" />
        )}
        <span className="text-xs font-medium text-zinc-600">
          {isPaused
            ? 'Strategy ready — review before continuing'
            : isComplete
            ? 'Article complete'
            : lastEvent?.label ?? 'Generating...'}
        </span>
      </div>

      <div className="flex gap-1 flex-wrap">
        {PHASE_ORDER.map((phase) => {
          const seen = events.some(e => e.phase === phase || (phase === 'continue' && e.phase === 'continue'))
          return (
            <div
              key={phase}
              className={cn(
                'h-1 rounded-full flex-1 min-w-4 transition-colors',
                seen ? 'bg-zinc-900' : 'bg-zinc-200'
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
