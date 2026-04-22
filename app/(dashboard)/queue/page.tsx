'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { ArrowUpRight, X, Loader2, CalendarClock } from 'lucide-react'
import type { Output, OutputContent } from '@/types/domain'

function formatSlot(isoUtc: string): string {
  return DateTime.fromISO(isoUtc).toLocal().toFormat("EEE, MMM d · h:mm a")
}

function excerpt(output: Output): string {
  const body = (output.content as OutputContent).body ?? ''
  return body.length > 120 ? body.slice(0, 120) + '…' : body
}

export default function QueuePage() {
  const [items, setItems] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const res = await fetch('/api/queue')
    const data = res.ok ? await res.json() : []
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUnschedule(id: string) {
    setRemoving((r) => ({ ...r, [id]: true }))
    await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', scheduled_at: null }),
    })
    setItems((prev) => prev.filter((o) => o.id !== id))
    setRemoving((r) => ({ ...r, [id]: false }))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {loading
            ? 'Loading…'
            : items.length === 0
            ? 'Nothing scheduled yet.'
            : `${items.length} post${items.length !== 1 ? 's' : ''} coming up.`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <CalendarClock className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-900">Queue is empty</p>
          <p className="mt-1 text-sm text-zinc-500">
            Approve drafts from your Inbox to fill it.
          </p>
          <Link
            href="/inbox"
            className="mt-4 inline-block text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900 transition-colors"
          >
            Go to Inbox →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-shadow hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                  {item.scheduledAt ? formatSlot(item.scheduledAt) : 'Unscheduled'}
                </p>
                {item.title && (
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>
                )}
                <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">{excerpt(item)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                <Link
                  href={`/studio/${item.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-700"
                  title="Open in Studio"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => handleUnschedule(item.id)}
                  disabled={!!removing[item.id]}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:text-red-400"
                  title="Remove from queue"
                >
                  {removing[item.id]
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
