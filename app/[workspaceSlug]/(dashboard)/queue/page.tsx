'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Output, OutputContent } from '@/types/domain'
import { SkeletonList } from '@/components/ui/skeleton'

type QueueTab = 'queued' | 'published' | 'failed'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function QueuePage() {
  const { slug } = useWorkspace()
  const [tab, setTab] = useState<QueueTab>('queued')
  const [queued, setQueued] = useState<Output[]>([])
  const [published, setPublished] = useState<Output[]>([])
  const [failed, setFailed] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/outputs?status=queued&limit=100').then(r => r.ok ? r.json() : []),
      fetch('/api/outputs?status=published&limit=100').then(r => r.ok ? r.json() : []),
      fetch('/api/outputs?status=failed&limit=100').then(r => r.ok ? r.json() : []),
    ])
      .then(([q, p, f]) => {
        setQueued(q)
        setPublished(p)
        setFailed(f)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const tabs: { key: QueueTab; label: string; count: number }[] = [
    { key: 'queued', label: 'Queued', count: queued.length },
    { key: 'published', label: 'Published', count: published.length },
    { key: 'failed', label: 'Failed', count: failed.length },
  ]

  const items = tab === 'queued' ? queued : tab === 'published' ? published : failed

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Track scheduled, published, and failed posts.</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            {t.label}
            {!loading && t.count > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                tab === t.key
                  ? t.key === 'failed' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
                  : t.key === 'failed' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={3} rowClassName="h-20" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {tab === 'queued' && <Clock className="mb-3 h-8 w-8 text-zinc-300" />}
            {tab === 'published' && <CheckCircle2 className="mb-3 h-8 w-8 text-zinc-300" />}
            {tab === 'failed' && <AlertCircle className="mb-3 h-8 w-8 text-zinc-300" />}
            <p className="text-sm font-medium text-zinc-900">
              {tab === 'queued' && 'Nothing in the queue'}
              {tab === 'published' && 'No published posts yet'}
              {tab === 'failed' && 'No failed posts'}
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {items.map(item => (
            <Link
              key={item.id}
              href={`/${slug}/studio/${item.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.channels?.platform && (
                    <span className="text-xs font-medium text-zinc-500 capitalize">{item.channels.platform}</span>
                  )}
                  <span className="text-xs text-zinc-400">
                    {tab === 'published' && item.publishedAt
                      ? `Published ${timeAgo(item.publishedAt)}`
                      : tab === 'queued' && item.scheduledAt
                        ? `Scheduled for ${formatDate(item.scheduledAt)}`
                        : `Updated ${timeAgo(item.updatedAt)}`}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                  {item.title ?? 'Untitled'}
                </p>
                {tab === 'failed' && item.lastPublishError ? (
                  <p className="text-xs text-red-500 line-clamp-1 mt-0.5">{item.lastPublishError}</p>
                ) : (
                  <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">
                    {(item.content as OutputContent).body?.slice(0, 120) ?? ''}
                  </p>
                )}
              </div>
              {tab === 'failed' && (
                <AlertCircle className="shrink-0 h-4 w-4 text-red-400 mt-0.5" />
              )}
              {tab === 'published' && (
                <CheckCircle2 className="shrink-0 h-4 w-4 text-green-500 mt-0.5" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
