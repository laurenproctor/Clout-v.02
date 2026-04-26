'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DateTime } from 'luxon'
import { Loader2, CheckCircle2, CalendarClock, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyPlanItem, Output, OutputContent, ChannelPlatform } from '@/types/domain'

function excerpt(output: Output): string {
  const body = (output.content as OutputContent).body ?? ''
  return body.length > 140 ? body.slice(0, 140) + '…' : body
}

function formatSlotPreview(iso: string | null): string {
  if (!iso) return 'No slot available'
  return DateTime.fromISO(iso).toLocal().toFormat("EEE, MMM d · h:mm a") + ' (suggested)'
}

function mapItem(raw: Record<string, unknown>): WeeklyPlanItem {
  const o = raw.output as Record<string, unknown>
  const ch = o.channels as { platform: string; label: string | null } | undefined
  return {
    suggestedSlot: raw.suggestedSlot as string | null,
    rank: raw.rank as number,
    output: {
      id:                  o.id as string,
      workspaceId:         o.workspaceId as string,
      generationId:        o.generationId as string,
      channelId:           o.channelId as string | null,
      status:              o.status as Output['status'],
      title:               o.title as string | null,
      content:             o.content as OutputContent,
      approvedBy:          o.approvedBy as string | null,
      approvedAt:          o.approvedAt as string | null,
      providerPostId:      o.providerPostId as string | null,
      publishedAt:         o.publishedAt as string | null,
      scheduledAt:         o.scheduledAt as string | null,
      lastPublishError:    o.lastPublishError as string | null,
      approvedForWeek:     (o.approvedForWeek as boolean) ?? false,
      weekBucket:          o.weekBucket as string | null,
      performanceSnapshot: o.performanceSnapshot as Record<string, unknown> | null,
      createdAt:           o.createdAt as string,
      updatedAt:           o.updatedAt as string,
      channels:            ch ? { platform: ch.platform as ChannelPlatform, label: ch.label } : undefined,
    },
  }
}

export default function InboxPage() {
  const router = useRouter()
  const [items, setItems] = useState<WeeklyPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [successCount, setSuccessCount] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  const anyActing = approvingIds.size > 0

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/weekly-plan')
    const data = res.ok ? await res.json() : []
    setItems((data as Record<string, unknown>[]).map(mapItem))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = items.filter((i) => !skipped.has(i.output.id))

  // Clamp focus when visible list shrinks
  useEffect(() => {
    if (focusedIndex === null) return
    if (visible.length === 0) { setFocusedIndex(null); return }
    if (focusedIndex >= visible.length) setFocusedIndex(visible.length - 1)
  }, [visible.length, focusedIndex])

  // Keyboard shortcuts — no dependency array so always captures fresh state
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't fire when user is typing
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return

      const len = visible.length
      if (len === 0) return

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        setFocusedIndex((cur) => {
          const next = cur === null ? 0 : Math.min(cur + 1, len - 1)
          cardRefs.current.get(visible[next].output.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          return next
        })
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setFocusedIndex((cur) => {
          const next = cur === null ? 0 : Math.max(cur - 1, 0)
          cardRefs.current.get(visible[next].output.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          return next
        })
      }

      if ((e.key === 'a' || e.key === 'A') && focusedIndex !== null && !anyActing) {
        e.preventDefault()
        const item = visible[focusedIndex]
        if (item) void handleApproveSelected([item.output.id])
      }

      if ((e.key === 's' || e.key === 'S') && focusedIndex !== null) {
        e.preventDefault()
        const item = visible[focusedIndex]
        if (item) setSkipped((s) => new Set([...s, item.output.id]))
        // focus stays at same index; useEffect above clamps if needed
      }

      if ((e.key === 'e' || e.key === 'E') && focusedIndex !== null) {
        e.preventDefault()
        const item = visible[focusedIndex]
        if (item) router.push(`/studio/${item.output.id}`)
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function toggleSelect(id: string) {
    if (anyActing) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleApproveSelected(ids: string[]) {
    if (anyActing || ids.length === 0) return
    setApprovingIds(new Set(ids))

    const approvals = ids.map((id) => {
      const item = items.find((i) => i.output.id === id)!
      return { outputId: id, scheduledAt: item.suggestedSlot }
    })

    const res = await fetch('/api/weekly-plan/approve-selected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvals }),
    })

    setApprovingIds(new Set())

    if (res.ok) {
      setItems((prev) => prev.filter((i) => !ids.includes(i.output.id)))
      setSelected(new Set())
      setSuccessCount((c) => (c ?? 0) + ids.length)
    }
  }

  async function handleApproveWeek() {
    const allIds = visible.map((i) => i.output.id)
    setShowConfirm(false)
    await handleApproveSelected(allIds)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Success panel — dismissible, cards remain visible below */}
      {successCount !== null && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {successCount} post{successCount === 1 ? '' : 's'} queued for this week
          </span>
          <button
            onClick={() => setSuccessCount(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">This Week&apos;s Plan</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {loading ? 'Building your plan…' : `${visible.length} draft${visible.length === 1 ? '' : 's'} ready to review`}
          </p>
        </div>

        {!loading && visible.length > 0 && (
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={() => handleApproveSelected([...selected])}
                disabled={anyActing}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                {anyActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Approve {selected.size} selected
              </button>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={anyActing}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40"
            >
              Approve Week
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Approve Week confirmation */}
      {showConfirm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">
            Queue all {visible.length} draft{visible.length === 1 ? '' : 's'} for this week?
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Each post will be scheduled at its suggested time slot. You can unschedule from the Queue page.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleApproveWeek}
              disabled={anyActing}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
            >
              {anyActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Confirm — Queue {visible.length} posts
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <CalendarClock className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-900">All caught up</p>
          <p className="mt-1 text-sm text-zinc-500">No drafts are ready for this week.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {visible.map((item, idx) => (
              <PlanCard
                key={item.output.id}
                item={item}
                isSelected={selected.has(item.output.id)}
                isActing={approvingIds.has(item.output.id)}
                isFocused={focusedIndex === idx}
                anyActing={anyActing}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(item.output.id, el)
                  else cardRefs.current.delete(item.output.id)
                }}
                onToggle={() => toggleSelect(item.output.id)}
                onApprove={() => handleApproveSelected([item.output.id])}
                onSkip={() => setSkipped((s) => new Set([...s, item.output.id]))}
                onFocus={() => setFocusedIndex(idx)}
              />
            ))}
          </ul>

          {/* Keyboard shortcut legend */}
          <p className="select-none pb-2 pt-4 text-center text-[11px] text-zinc-400">
            <kbd className="font-sans">J</kbd> · <kbd className="font-sans">K</kbd>{' '}
            navigate&nbsp;&nbsp;
            <kbd className="font-sans">A</kbd> approve&nbsp;&nbsp;
            <kbd className="font-sans">S</kbd> skip&nbsp;&nbsp;
            <kbd className="font-sans">E</kbd> edit in studio
          </p>
        </>
      )}
    </div>
  )
}

function PlanCard({
  item, isSelected, isActing, isFocused, anyActing, cardRef, onToggle, onApprove, onSkip, onFocus,
}: {
  item: WeeklyPlanItem
  isSelected: boolean
  isActing: boolean
  isFocused: boolean
  anyActing: boolean
  cardRef: (el: HTMLLIElement | null) => void
  onToggle: () => void
  onApprove: () => void
  onSkip: () => void
  onFocus: () => void
}) {
  const { output, suggestedSlot } = item
  return (
    <li
      ref={cardRef}
      onClick={onFocus}
      className={cn(
        'rounded-xl border bg-white px-5 py-4 transition-all hover:shadow-sm cursor-default',
        isSelected ? 'border-zinc-400' : 'border-zinc-200',
        isFocused && 'ring-2 ring-zinc-900 ring-offset-1',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          disabled={anyActing}
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            isSelected
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 hover:border-zinc-500',
          )}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected && (
            <svg viewBox="0 0 8 6" className="h-2.5 w-2.5 fill-current">
              <path d="M1 3l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {output.title && (
            <p className="text-sm font-medium text-zinc-900 truncate">{output.title}</p>
          )}
          <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">{excerpt(output)}</p>
          <p className="mt-1.5 text-xs text-zinc-400">{formatSlotPreview(suggestedSlot)}</p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onSkip() }}
            disabled={anyActing}
            className="flex h-8 items-center rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-40"
          >
            Skip
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApprove() }}
            disabled={anyActing}
            className="flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Approve &amp; Queue
          </button>
        </div>
      </div>
    </li>
  )
}
