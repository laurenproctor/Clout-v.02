'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { Check, X, Pencil, Clock, Loader2, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Output, OutputContent } from '@/types/domain'

function preview(output: Output): string {
  const body = (output.content as OutputContent).body ?? ''
  return body.length > 180 ? body.slice(0, 180) + '…' : body
}

function timeAgo(dateStr: string): string {
  return DateTime.fromISO(dateStr).toRelative() ?? ''
}

function formatSlot(isoUtc: string): string {
  return DateTime.fromISO(isoUtc).toLocal().toFormat("EEE, MMM d 'at' h:mm a")
}

export default function InboxPage() {
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<Record<string, boolean>>({})
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string }>>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/inbox')
    const data = res.ok ? await res.json() : []
    setOutputs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function addToast(id: string, msg: string) {
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }

  async function handleApprove(output: Output) {
    setApproving((a) => ({ ...a, [output.id]: true }))
    const res = await fetch(`/api/outputs/${output.id}/queue`, { method: 'POST' })
    setOutputs((prev) => prev.filter((o) => o.id !== output.id))
    if (res.ok) {
      const data = await res.json()
      const slotLabel = data.scheduledAt ? formatSlot(data.scheduledAt) : 'soon'
      addToast(output.id, `Scheduled for ${slotLabel}`)
    }
    setApproving((a) => ({ ...a, [output.id]: false }))
  }

  async function handleReject(id: string) {
    setOutputs((prev) => prev.filter((o) => o.id !== id))
    await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Inbox</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {loading
            ? 'Loading…'
            : outputs.length === 0
            ? 'Nothing waiting for review.'
            : `${outputs.length} draft${outputs.length !== 1 ? 's' : ''} ready for your week.`}
        </p>
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              {t.msg}
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
        </div>
      ) : outputs.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <Check className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-900">You're all caught up</p>
          <p className="mt-1 text-sm text-zinc-500">New drafts appear here after generation.</p>
          <Link
            href="/capture"
            className="mt-4 inline-block text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900 transition-colors"
          >
            Start a capture →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {outputs.map((output) => (
            <li
              key={output.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 capitalize">
                      {output.status}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {timeAgo(output.createdAt)}
                    </span>
                  </div>
                  {output.title && (
                    <p className="mb-1.5 text-sm font-medium text-zinc-900 truncate">{output.title}</p>
                  )}
                  <p className="text-sm leading-relaxed text-zinc-500 line-clamp-3">
                    {preview(output)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                  <Link
                    href={`/studio/${output.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-700"
                    title="Edit in Studio"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleReject(output.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:text-red-500"
                    title="Reject"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleApprove(output)}
                    disabled={!!approving[output.id]}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                      approving[output.id]
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-700'
                    )}
                  >
                    {approving[output.id]
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <CalendarPlus className="h-3.5 w-3.5" />}
                    Approve & Schedule
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
