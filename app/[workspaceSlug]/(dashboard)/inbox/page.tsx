'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'

type InboxItem = {
  id: string
  title: string | null
  content: { body?: string }
  status: 'draft' | 'review'
  channel_id: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function InboxPage() {
  const { slug } = useWorkspace()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inbox')
      .then(r => r.ok ? r.json() : [])
      .then((data: InboxItem[]) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Inbox</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Drafts and content waiting for your review.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Inbox className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">All caught up</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              No drafts or content waiting for review.
            </p>
            <Link
              href={`/${slug}/studio`}
              className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Go to Studio
            </Link>
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
                  <span className="text-xs text-zinc-400">{timeAgo(item.created_at)}</span>
                </div>
                <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                  {item.title ?? 'Untitled draft'}
                </p>
                <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">
                  {item.content?.body?.slice(0, 120) ?? ''}
                </p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                item.status === 'review' ? 'bg-yellow-50 text-yellow-700' : 'bg-zinc-100 text-zinc-600'
              )}>
                {item.status}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <p className="text-xs text-zinc-400 text-right">
          {items.length} item{items.length !== 1 ? 's' : ''} waiting for review
        </p>
      )}
    </div>
  )
}
