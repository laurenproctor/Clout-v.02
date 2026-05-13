'use client'

import { cn } from '@/lib/utils'
import type { Angle } from '@/types/domain'

interface AngleOptionsProps {
  angles: Angle[]
  bestAngleGenerating: boolean
  draftAllGenerating: boolean
  onDraftBest: () => void
  onDraftOne: (angle: Angle) => void
  onDraftAll: () => void
  onSkip: () => void
}

export function AngleOptions({
  angles,
  bestAngleGenerating,
  draftAllGenerating,
  onDraftBest,
  onDraftOne,
  onDraftAll,
  onSkip,
}: AngleOptionsProps) {
  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-zinc-900">
            {angles.length} angles found
          </p>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            {bestAngleGenerating
              ? 'Drafting the strongest now…'
              : 'Strongest angle drafted.'}
          </p>
        </div>
      </div>

      {/* Angle cards */}
      <div className="flex flex-col gap-3">
        {angles.map((angle, i) => (
          <div
            key={angle.id}
            className={cn(
              'rounded-xl border p-4 flex flex-col gap-2 transition-colors',
              i === 0 ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-200 bg-white'
            )}
          >
            {i === 0 && (
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Strongest
              </span>
            )}
            <p className="text-[14px] font-semibold text-zinc-900 leading-snug">
              {angle.title}
            </p>
            <p className="text-[13px] text-zinc-600 leading-relaxed">
              {angle.summary}
            </p>
            <p className="text-[12px] text-zinc-400 italic leading-relaxed">
              Why this works: {angle.rationale}
            </p>
            <div className="flex gap-2 mt-1">
              {i === 0 ? (
                <button
                  type="button"
                  onClick={onDraftBest}
                  disabled={bestAngleGenerating}
                  className={cn(
                    'rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors',
                    bestAngleGenerating
                      ? 'bg-zinc-200 text-zinc-400 cursor-wait'
                      : 'bg-zinc-900 text-white hover:bg-zinc-700'
                  )}
                >
                  {bestAngleGenerating ? 'Drafting…' : 'Draft Best Angle →'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDraftOne(angle)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
                >
                  Draft This →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary actions */}
      <div className="flex items-center gap-4 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onDraftAll}
          disabled={draftAllGenerating}
          className={cn(
            'text-[13px] font-medium transition-colors',
            draftAllGenerating
              ? 'text-zinc-400 cursor-wait'
              : 'text-zinc-600 hover:text-zinc-900'
          )}
        >
          {draftAllGenerating ? 'Drafting all…' : `Draft All ${angles.length} →`}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Skip, use current draft
        </button>
      </div>
    </div>
  )
}
