'use client'

import { useEffect } from 'react'
import { DateTime } from 'luxon'
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyPlanItem } from '@/types/domain'

interface PostDrawerProps {
  items: WeeklyPlanItem[]
  activeIndex: number
  isActing: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onApprove: (id: string, scheduledAt: string | null) => void
  onSkip: (id: string) => void
  onEdit: (id: string) => void
}

function formatSlot(iso: string | null): string {
  if (!iso) return 'No slot assigned'
  return DateTime.fromISO(iso).toLocal().toFormat("EEE, MMM d · h:mm a") + ' · Suggested'
}

function channelLabel(item: WeeklyPlanItem): string {
  if (item.output.channels?.label) return item.output.channels.label
  if (item.output.channels?.platform) return item.output.channels.platform
  return 'Unknown'
}

export function PostDrawer({
  items,
  activeIndex,
  isActing,
  onClose,
  onPrev,
  onNext,
  onApprove,
  onSkip,
  onEdit,
}: PostDrawerProps) {
  const item = items[activeIndex]
  const total = items.length
  const isFirst = activeIndex === 0
  const isLast = activeIndex === total - 1

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'j' || e.key === 'J') { if (!isLast) onNext(); return }
      if (e.key === 'k' || e.key === 'K') { if (!isFirst) onPrev(); return }
      if ((e.key === 'a' || e.key === 'A') && !isActing) {
        onApprove(item.output.id, item.suggestedSlot)
        return
      }
      if (e.key === 'e' || e.key === 'E') { onEdit(item.output.id); return }
      if (e.key === 's' || e.key === 'S') { onSkip(item.output.id); return }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [item, activeIndex, isFirst, isLast, isActing, onClose, onNext, onPrev, onApprove, onSkip, onEdit])

  if (!item) return null

  const body = (item.output.content as { body?: string }).body ?? ''

  return (
    <div
      className="flex flex-col bg-white border-l border-zinc-200 shadow-[-8px_0_24px_rgba(0,0,0,0.08)]"
      style={{ width: 920 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-100" style={{ padding: '16px 50px 14px' }}>
        {/* Meta row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium tracking-[0.04em] uppercase text-zinc-400">
            Reviewing {activeIndex + 1} of {total} this week
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-30 disabled:cursor-default"
              title="Previous (K)"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onNext}
              disabled={isLast}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-30 disabled:cursor-default"
              title="Next (J)"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-600 hover:bg-zinc-100"
              title="Close (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="text-[22px] font-semibold leading-snug tracking-[-0.02em] text-zinc-900">
          {item.output.title ?? body.slice(0, 80)}
        </p>

        {/* Channel + slot */}
        <div className="flex items-center gap-2.5 mt-2.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-[0.02em] uppercase bg-zinc-100 border border-zinc-200 text-zinc-500">
            {channelLabel(item)}
          </span>
          <span className="text-[12px] text-zinc-400">{formatSlot(item.suggestedSlot)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 50px 0' }}>
        <p className="text-[19px] leading-[1.85] text-zinc-800 whitespace-pre-wrap">{body}</p>

        {/* Keyboard hints */}
        <div className="flex items-center gap-4 mt-8 pt-5 border-t border-zinc-100 pb-6">
          {[
            { key: 'J', label: 'Next' },
            { key: 'K', label: 'Prev' },
            { key: 'A', label: 'Approve' },
            { key: 'E', label: 'Edit' },
            { key: 'Esc', label: 'Close' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-zinc-100 border border-zinc-200 border-b-2 rounded text-[10px] font-medium text-zinc-500">
                {key}
              </kbd>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 flex items-center gap-2 border-t border-zinc-100 bg-white"
        style={{ padding: '14px 50px' }}
      >
        <button
          onClick={() => onSkip(item.output.id)}
          disabled={isActing}
          className="h-[34px] px-3.5 rounded-lg border border-zinc-200 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          Skip
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onEdit(item.output.id)}
          disabled={isActing}
          className="h-[34px] px-3.5 rounded-lg bg-zinc-100 border border-zinc-200 text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-200 disabled:opacity-40"
        >
          Edit in Studio
        </button>
        <button
          onClick={() => onApprove(item.output.id, item.suggestedSlot)}
          disabled={isActing}
          className="h-[34px] px-3.5 rounded-lg bg-zinc-900 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 flex items-center gap-1.5"
        >
          {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
          Approve &amp; Queue
        </button>
      </div>
    </div>
  )
}
