'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DateTime } from 'luxon'
import { Loader2, CheckCircle2, CalendarClock, X, ChevronDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyPlanItem, Output, OutputContent, ChannelPlatform } from '@/types/domain'
import { PostDrawer } from './PostDrawer'

function excerpt(output: Output): string {
  const body = (output.content as OutputContent).body ?? ''
  return body.length > 140 ? body.slice(0, 140) + '…' : body
}

// Shift a slot forward by ~1.5 days to find a next available slot
function findNextSlot(currentSlot: string | null, allTaken: (string | null)[]): string | null {
  if (!currentSlot) return null
  const dt = DateTime.fromISO(currentSlot)
  const takenSet = new Set(allTaken.filter(Boolean).map((s) => DateTime.fromISO(s!).startOf('minute').toISO()))
  // Try up to 14 days forward in 1-day increments
  for (let i = 1; i <= 14; i++) {
    const candidate = dt.plus({ days: i })
    // Skip weekends (6=Sat, 7=Sun)
    if (candidate.weekday === 6 || candidate.weekday === 7) continue
    const key = candidate.startOf('minute').toISO()
    if (!takenSet.has(key)) return candidate.toUTC().toISO()!
  }
  return null
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
    selection_reason: (raw.selection_reason as string) ?? 'Strong editorial score',
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
      providerPostId:      o.providerPostId  as string | null,
      providerPostUrl:     o.providerPostUrl as string | null,
      publishedAt:         o.publishedAt as string | null,
      scheduledAt:         o.scheduledAt as string | null,
      lastPublishError:    o.lastPublishError as string | null,
      generationGroupId:   null,
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
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null)
  const [customSlots, setCustomSlots] = useState<Record<string, string | null>>({})

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

  // When drawer is open, J/K are handled by PostDrawer. When closed, open it.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (drawerIndex !== null) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (visible.length === 0) return
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        setDrawerIndex((prev) => Math.min((prev ?? -1) + 1, visible.length - 1))
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setDrawerIndex((prev) => Math.max((prev ?? 1) - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [drawerIndex, visible])

  function openDrawer(index: number) {
    setDrawerIndex(index)
  }

  function closeDrawer() {
    setDrawerIndex(null)
  }

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
      const scheduledAt = id in customSlots ? customSlots[id] : item.suggestedSlot
      return { outputId: id, scheduledAt }
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

  async function handleDrawerApprove(id: string, scheduledAt: string | null) {
    const currentIndex = drawerIndex ?? 0
    const remainingCount = visible.length - 1
    await handleApproveSelected([id])
    setDrawerIndex(remainingCount === 0 ? null : Math.min(currentIndex, remainingCount - 1))
  }

  function handleDrawerSkip(id: string) {
    setSkipped((s) => new Set([...s, id]))
    closeDrawer()
  }

  function handleDrawerEdit(id: string) {
    router.push(`/studio?outputId=${id}`)
  }

  function handleMoveToNextSlot(id: string) {
    const item = visible.find((i) => i.output.id === id)
    if (!item) return
    const currentSlot = id in customSlots ? customSlots[id] : item.suggestedSlot
    const allTaken = visible.map((i) => (i.output.id in customSlots ? customSlots[i.output.id] : i.suggestedSlot))
    const nextSlot = findNextSlot(currentSlot, allTaken)
    setCustomSlots((prev) => ({ ...prev, [id]: nextSlot }))
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* List pane */}
      <div
        className={cn(
          'flex-1 overflow-y-auto transition-[filter] duration-200',
          drawerIndex !== null && 'blur-[3px]',
        )}
      >
        {/* Dim overlay — clicks close drawer */}
        {drawerIndex !== null && (
          <div
            className="absolute inset-0 z-10 bg-zinc-900/10"
            onClick={closeDrawer}
          />
        )}

        <div className="mx-auto max-w-2xl space-y-6 py-8 px-6">
          {/* Success panel */}
          {successCount !== null && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {successCount} post{successCount === 1 ? '' : 's'} queued for this week
              </span>
              <button onClick={() => setSuccessCount(null)} className="text-emerald-500 hover:text-emerald-700">
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

          {/* Confirm panel */}
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

          {/* Cards */}
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
            <ul className="space-y-3">
              {visible.map((item, index) => (
                <PlanCard
                  key={item.output.id}
                  item={item}
                  effectiveSlot={item.output.id in customSlots ? customSlots[item.output.id] : item.suggestedSlot}
                  isSelected={selected.has(item.output.id)}
                  isActing={approvingIds.has(item.output.id)}
                  anyActing={anyActing}
                  isActive={drawerIndex === index}
                  onToggle={() => toggleSelect(item.output.id)}
                  onApprove={() => handleApproveSelected([item.output.id])}
                  onSkip={() => setSkipped((s) => new Set([...s, item.output.id]))}
                  onMoveToNextSlot={() => handleMoveToNextSlot(item.output.id)}
                  onClick={() => openDrawer(index)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerIndex !== null && (
        <PostDrawer
          items={visible}
          activeIndex={drawerIndex}
          isActing={anyActing}
          onClose={closeDrawer}
          onPrev={() => setDrawerIndex((i) => Math.max((i ?? 1) - 1, 0))}
          onNext={() => setDrawerIndex((i) => Math.min((i ?? 0) + 1, visible.length - 1))}
          onApprove={handleDrawerApprove}
          onSkip={handleDrawerSkip}
          onEdit={handleDrawerEdit}
        />
      )}
    </div>
  )
}

function PlanCard({
  item, effectiveSlot, isSelected, isActing, anyActing, isActive, onToggle, onApprove, onSkip, onMoveToNextSlot, onClick,
}: {
  item: WeeklyPlanItem
  effectiveSlot: string | null
  isSelected: boolean
  isActing: boolean
  anyActing: boolean
  isActive: boolean
  onToggle: () => void
  onApprove: () => void
  onSkip: () => void
  onMoveToNextSlot: () => void
  onClick: () => void
}) {
  const { output } = item
  const channelName = output.channels?.label ?? output.channels?.platform ?? null

  return (
    <li
      className={cn(
        'relative rounded-xl border bg-white px-5 py-4 cursor-pointer transition-shadow hover:shadow-sm',
        isActive
          ? 'border-zinc-900 shadow-[0_0_0_1px_#18181b]'
          : isSelected
          ? 'border-zinc-400'
          : 'border-zinc-200',
      )}
      onClick={onClick}
    >
      {/* Active left accent bar */}
      {isActive && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-zinc-900" />
      )}

      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          disabled={anyActing}
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            isActive || isSelected
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 hover:border-zinc-500',
          )}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {(isActive || isSelected) && (
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

          {/* Selection reason — editorial intelligence label */}
          <p className="mt-1 text-[11px] text-zinc-400 italic">· {item.selection_reason}</p>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {channelName && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-[0.02em] uppercase bg-zinc-100 border border-zinc-200 text-zinc-500">
                {channelName}
              </span>
            )}
            <span className="text-xs text-zinc-400">{formatSlotPreview(effectiveSlot)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSkip}
              disabled={anyActing}
              className="flex h-8 items-center rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-40"
            >
              Skip
            </button>
            <button
              onClick={onApprove}
              disabled={anyActing}
              className="flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
            >
              {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Approve &amp; Queue
            </button>
          </div>
          <button
            onClick={onMoveToNextSlot}
            disabled={anyActing}
            className="flex h-7 items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-40"
          >
            <ArrowRight className="h-3 w-3" />
            Move to Next Slot
          </button>
        </div>
      </div>
    </li>
  )
}
