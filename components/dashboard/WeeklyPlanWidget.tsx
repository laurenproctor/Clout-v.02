'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { CheckCircle2, ArrowRight, Loader2, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Output, OutputContent, WeeklyPlanItem } from '@/types/domain'

function excerpt(output: Output): string {
  const body = (output.content as OutputContent).body ?? ''
  return body.length > 100 ? body.slice(0, 100) + '…' : body
}

function formatSlot(iso: string | null): string {
  if (!iso) return 'Unscheduled'
  return DateTime.fromISO(iso).toLocal().toFormat("EEE, MMM d · h:mm a")
}

function mapItem(raw: Record<string, unknown>): WeeklyPlanItem {
  const o = raw.output as Record<string, unknown>
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
    },
  }
}

export function WeeklyPlanWidget() {
  const [items, setItems] = useState<WeeklyPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  // Track which items are being approved (optimistic)
  const [approving, setApproving] = useState<Set<string>>(new Set())
  // Track which items have been approved (for exit animation)
  const [approved, setApproved] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const res = await fetch('/api/weekly-plan')
    if (res.ok) {
      const data: Record<string, unknown>[] = await res.json()
      setItems(data.slice(0, 3).map(mapItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(item: WeeklyPlanItem) {
    const { output, suggestedSlot } = item
    // Optimistic: mark as approving immediately
    setApproving((s) => new Set([...s, output.id]))

    const res = await fetch('/api/weekly-plan/approve-selected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvals: [{ outputId: output.id, scheduledAt: suggestedSlot }] }),
    })

    if (res.ok) {
      // Show checkmark briefly, then slide out
      setApproving((s) => { const n = new Set(s); n.delete(output.id); return n })
      setApproved((s) => new Set([...s, output.id]))
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.output.id !== output.id))
        setApproved((s) => { const n = new Set(s); n.delete(output.id); return n })
      }, 600)
    } else {
      setApproving((s) => { const n = new Set(s); n.delete(output.id); return n })
    }
  }

  const visibleCount = items.filter((i) => !approved.has(i.output.id)).length

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">This Week&apos;s Plan</h2>
          {!loading && visibleCount > 0 && (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {visibleCount}
            </span>
          )}
        </div>
        <Link
          href="/inbox"
          className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Review all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Body */}
      {loading ? (
        <div className="px-5 pb-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5 animate-pulse">
              <div className="h-3 rounded bg-zinc-100 w-3/4" />
              <div className="h-3 rounded bg-zinc-100 w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 pb-5 text-center py-6">
          <p className="text-sm font-medium text-zinc-900">All caught up ✓</p>
          <p className="mt-0.5 text-xs text-zinc-400">No drafts waiting for approval.</p>
          <Link
            href="/studio"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Go to Studio <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => {
            const isApproving = approving.has(item.output.id)
            const isApproved = approved.has(item.output.id)
            return (
              <li
                key={item.output.id}
                className={cn(
                  'flex items-start gap-3 px-5 py-3.5 transition-all duration-500',
                  isApproved && 'opacity-0 scale-95 pointer-events-none'
                )}
              >
                <div className="min-w-0 flex-1">
                  {item.output.title && (
                    <p className="text-[13px] font-medium text-zinc-900 truncate leading-snug">
                      {item.output.title}
                    </p>
                  )}
                  <p className="text-[12px] text-zinc-400 mt-0.5 line-clamp-1">
                    {excerpt(item.output)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 font-medium tabular-nums">
                    {formatSlot(item.suggestedSlot)}
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(item)}
                  disabled={isApproving || isApproved}
                  className={cn(
                    'flex shrink-0 h-7 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold transition-all duration-200',
                    isApproved
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 disabled:opacity-60'
                  )}
                >
                  {isApproved ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Queued</>
                  ) : isApproving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    '→ Queue'
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Footer CTA when there are more items */}
      {!loading && items.length > 0 && (
        <div className="border-t border-zinc-100 px-5 py-2.5">
          <Link
            href="/inbox"
            className="flex items-center justify-between text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors group"
          >
            <span>Approve all this week</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
