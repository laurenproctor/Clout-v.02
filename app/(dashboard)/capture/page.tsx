'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, Zap, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Capture } from '@/types/domain'

type StatusFilter = 'all' | 'pending' | 'ready' | 'failed'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function CapturePage() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    fetch('/api/capture?private=false&limit=200')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setCaptures(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = captures.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesSearch = !search.trim() ||
      (c.rawContent ?? c.transcript ?? c.sourceUrl ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Capture</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Raw inputs waiting to become content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/private"
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Private
          </Link>
          <Link
            href="/capture/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            + New Capture
          </Link>
        </div>
      </div>

      {/* Search + filter row */}
      {!loading && captures.length > 0 && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              className="w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              placeholder="Search captures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
            {(['all', 'pending', 'ready', 'failed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  statusFilter === s ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        captures.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                <Zap className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-900">No captures yet</p>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Paste a thought, record your voice, paste a URL, or fill out a quick form.
              </p>
              <Link
                href="/capture/new"
                className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                New capture
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">No captures match your filter.</p>
              <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="mt-2 text-sm text-zinc-900 underline">
                Clear filters
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {filtered.map((capture) => (
            <Link
              key={capture.id}
              href={`/capture/${capture.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {capture.source}
                  </span>
                  {capture.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-zinc-400">{timeAgo(capture.createdAt)}</span>
                </div>
                <p className="text-sm text-zinc-800 line-clamp-2">
                  {capture.rawContent ?? capture.transcript ?? capture.sourceUrl ?? '—'}
                </p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                capture.status === 'ready' ? 'bg-green-50 text-green-700' :
                capture.status === 'failed' ? 'bg-red-50 text-red-600' :
                'bg-zinc-100 text-zinc-500'
              )}>
                {capture.status}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-zinc-400 text-right">
          {filtered.length} of {captures.length} capture{captures.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
