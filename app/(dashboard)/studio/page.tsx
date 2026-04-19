'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Output } from '@/types/domain'

type FilterStatus = 'all' | 'draft' | 'review' | 'approved'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function StudioPage() {
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    const url = filter === 'all' ? '/api/outputs' : `/api/outputs?status=${filter}`
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setOutputs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Studio</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Review, edit, and approve your generated content.</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
        {(['all', 'draft', 'review', 'approved'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true) }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : outputs.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <PenSquare className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No content yet</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Create a capture and run it through a Lens to generate content.
            </p>
            <Link
              href="/capture/new"
              className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              New capture
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {outputs.map((output) => (
            <Link
              key={output.id}
              href={`/studio/${output.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-400">{timeAgo(output.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                  {output.title ?? 'Untitled output'}
                </p>
                <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">
                  {(output.content as { body?: string }).body?.slice(0, 120) ?? ''}
                </p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                output.status === 'approved' ? 'bg-green-50 text-green-700' :
                output.status === 'review' ? 'bg-yellow-50 text-yellow-700' :
                'bg-zinc-100 text-zinc-600'
              )}>
                {output.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
