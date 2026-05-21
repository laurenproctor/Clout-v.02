'use client'

import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'narrative'

interface CalendarToolbarProps {
  weekStart: string
  conceptCount: number
  postCount: number
  healthScore: number
  viewMode: ViewMode
  onPrevWeek: () => void
  onNextWeek: () => void
  onViewModeChange: (mode: ViewMode) => void
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setUTCDate(end.getUTCDate() + 6)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${months[start.getUTCMonth()]} ${start.getUTCDate()} – ${end.getUTCDate()}, ${start.getUTCFullYear()}`
  }
  return `${months[start.getUTCMonth()]} ${start.getUTCDate()} – ${months[end.getUTCMonth()]} ${end.getUTCDate()}, ${start.getUTCFullYear()}`
}

export function CalendarToolbar({
  weekStart,
  conceptCount,
  postCount,
  healthScore,
  viewMode,
  onPrevWeek,
  onNextWeek,
  onViewModeChange,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onPrevWeek}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          ← Prev
        </button>
        <div>
          <p className="text-[15px] font-black text-zinc-900 tracking-tight">
            {formatWeekLabel(weekStart)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {conceptCount} concepts · {postCount} posts · Narrative health {healthScore}%
          </p>
        </div>
        <button
          onClick={onNextWeek}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          Next →
        </button>
      </div>

      <div className="flex bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 gap-0.5">
        {(['grid', 'narrative'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              'px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer',
              viewMode === mode
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-600'
            )}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
