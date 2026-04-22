'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import {
  ArrowUpRight, X, Loader2, CalendarClock,
  CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Output, OutputContent, OutputStatus } from '@/types/domain'

function formatSlot(isoUtc: string | null): string {
  if (!isoUtc) return 'Unscheduled'
  return DateTime.fromISO(isoUtc).toLocal().toFormat("EEE, MMM d · h:mm a")
}

function excerpt(output: Output): string {
  const body = (output.content as OutputContent).body ?? ''
  return body.length > 120 ? body.slice(0, 120) + '…' : body
}

function linkedInPostUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued:     { label: 'Queued',      color: 'text-violet-600 bg-violet-50 border-violet-200' },
  publishing: { label: 'Publishing…', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  published:  { label: 'Published',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  failed:     { label: 'Failed',      color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function QueuePage() {
  const [items, setItems] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const res = await fetch('/api/queue')
    const data = res.ok ? await res.json() : []
    setItems(data.map((r: Record<string, unknown>) => ({
      ...r,
      workspaceId:      r.workspace_id,
      generationId:     r.generation_id,
      channelId:        r.channel_id,
      approvedBy:       r.approved_by,
      approvedAt:       r.approved_at,
      providerPostId:   r.provider_post_id,
      publishedAt:      r.published_at,
      scheduledAt:      r.scheduled_at,
      lastPublishError: r.last_publish_error,
      createdAt:        r.created_at,
      updatedAt:        r.updated_at,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUnschedule(id: string) {
    setActing((a) => ({ ...a, [id]: true }))
    await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', scheduled_at: null }),
    })
    setItems((prev) => prev.filter((o) => o.id !== id))
    setActing((a) => ({ ...a, [id]: false }))
  }

  async function handleRetry(id: string) {
    setActing((a) => ({ ...a, [id]: true }))
    await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'queued', last_publish_error: null }),
    })
    await load()
    setActing((a) => ({ ...a, [id]: false }))
  }

  const queued    = items.filter((i) => i.status === 'queued')
  const active    = items.filter((i) => i.status === 'publishing')
  const published = items.filter((i) => i.status === 'published')
  const failed    = items.filter((i) => i.status === 'failed')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {loading ? 'Loading…' : `${queued.length} queued · ${published.length} published · ${failed.length} failed`}
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
          <p className="mt-1 text-sm text-zinc-500">Approve drafts from your Inbox to fill it.</p>
          <Link href="/inbox" className="mt-4 inline-block text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900 transition-colors">
            Go to Inbox →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {failed.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Needs Attention
              </h2>
              <ul className="space-y-2">
                {failed.map((item) => (
                  <FailedRow key={item.id} item={item} acting={!!acting[item.id]} onRetry={() => handleRetry(item.id)} />
                ))}
              </ul>
            </section>
          )}

          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-blue-400">
                Publishing now
              </h2>
              <ul className="space-y-2">
                {active.map((item) => (
                  <QueueRow key={item.id} item={item} acting={false} onAction={() => {}} showAction={false} />
                ))}
              </ul>
            </section>
          )}

          {queued.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Upcoming
              </h2>
              <ul className="space-y-2">
                {queued.map((item) => (
                  <QueueRow key={item.id} item={item} acting={!!acting[item.id]} onAction={() => handleUnschedule(item.id)} showAction />
                ))}
              </ul>
            </section>
          )}

          {published.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Published
              </h2>
              <ul className="space-y-2">
                {published.map((item) => (
                  <PublishedRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function RowShell({ item, right }: { item: Output; right: React.ReactNode }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.queued
  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-shadow hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', cfg.color)}>
            {cfg.label}
          </span>
          {item.scheduledAt && item.status !== 'published' && (
            <span className="text-xs text-zinc-400">{formatSlot(item.scheduledAt)}</span>
          )}
        </div>
        {item.title && <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>}
        <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">{excerpt(item)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">{right}</div>
    </li>
  )
}

function QueueRow({
  item, acting, onAction, showAction,
}: {
  item: Output
  acting: boolean
  onAction: () => void
  showAction: boolean
}) {
  return (
    <RowShell item={item} right={
      <>
        <Link href={`/studio/${item.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-700"
          title="Open in Studio"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        {showAction && (
          <button
            onClick={onAction}
            disabled={acting}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:text-red-400"
            title="Remove from queue"
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </>
    } />
  )
}

function FailedRow({
  item, acting, onRetry,
}: {
  item: Output
  acting: boolean
  onRetry: () => void
}) {
  return (
    <li className="rounded-xl border border-red-100 bg-red-50/30 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_CONFIG.failed.color)}>
              Failed
            </span>
            {item.scheduledAt && (
              <span className="text-xs text-zinc-400">{formatSlot(item.scheduledAt)}</span>
            )}
          </div>
          {item.title && <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>}
          {item.lastPublishError && (
            <p className="mt-1 text-sm text-red-500">{item.lastPublishError}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Link href="/channels" className="flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900">
            Reconnect
          </Link>
          <Link href={`/studio/${item.id}`} className="flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900">
            Edit
          </Link>
          <button
            onClick={onRetry}
            disabled={acting}
            className="flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Retry
          </button>
        </div>
      </div>
    </li>
  )
}

function PublishedRow({ item }: { item: Output }) {
  const publishedLabel = item.publishedAt
    ? DateTime.fromISO(item.publishedAt).toLocal().toFormat("MMM d 'at' h:mm a")
    : null

  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_CONFIG.published.color)}>
            Published
          </span>
          {publishedLabel && <span className="text-xs text-zinc-400">{publishedLabel}</span>}
        </div>
        {item.title && <p className="text-sm font-medium text-zinc-700 truncate">{item.title}</p>}
        <p className="mt-0.5 text-sm text-zinc-400 line-clamp-1">{excerpt(item)}</p>
      </div>
      {item.providerPostId && (
        <a
          href={linkedInPostUrl(item.providerPostId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Post
        </a>
      )}
    </li>
  )
}
