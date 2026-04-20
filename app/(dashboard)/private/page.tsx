'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Capture, PrivateEnrichment } from '@/types/domain'

type Tab = 'raw' | 'enriched'

const SAMPLE_TAGS = ['All', 'Work', 'Passions', 'Love', 'Health', 'Growth']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function PrivatePage() {
  const [activeTab, setActiveTab] = useState<Tab>('raw')
  const [activeTag, setActiveTag] = useState('All')
  const [captures, setCaptures] = useState<Capture[]>([])
  const [enrichments, setEnrichments] = useState<PrivateEnrichment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const tagParam = activeTag !== 'All' ? `&tags=${activeTag.toLowerCase()}` : ''
      const [rawRes, enrichedRes] = await Promise.all([
        fetch(`/api/private?view=raw${tagParam}`),
        fetch(`/api/private?view=enriched${tagParam}`),
      ])
      if (rawRes.ok) setCaptures(await rawRes.json())
      if (enrichedRes.ok) setEnrichments(await enrichedRes.json())
      setLoading(false)
    }
    load()
  }, [activeTag])

  // Build enrichment lookup by capture_id
  const enrichmentMap = new Map(enrichments.map((e) => [e.captureId, e]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-400" />
            <h1 className="text-xl font-semibold text-zinc-900">Private Feed</h1>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Your unfiltered thoughts — raw and enriched.
          </p>
        </div>
        <Link
          href="/capture/new"
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Lock className="h-3.5 w-3.5" />
          Private capture
        </Link>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-4 border-b border-zinc-200">
        {(['raw', 'enriched'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-3 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-700'
            )}
          >
            {tab === 'enriched' ? '✦ Enriched' : 'Raw'}
          </button>
        ))}
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2">
        {SAMPLE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeTag === tag
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'raw' ? (
        captures.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {captures.map((capture) => (
              <div key={capture.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  {capture.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-zinc-400">{timeAgo(capture.createdAt)}</span>
                </div>
                <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {capture.rawContent ?? capture.transcript ?? capture.sourceUrl ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        captures.length === 0 ? (
          <EmptyState enriched />
        ) : (
          <div className="space-y-4">
            {captures.map((capture) => {
              const enrichment = enrichmentMap.get(capture.id)
              return (
                <div key={capture.id} className="rounded-lg border border-zinc-200 bg-white p-5 space-y-3">
                  {/* Raw */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {capture.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto text-xs text-zinc-400">{timeAgo(capture.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-2">
                      {capture.rawContent ?? capture.transcript ?? '—'}
                    </p>
                  </div>
                  {/* Enrichment */}
                  {enrichment ? (
                    <div className="border-t border-zinc-100 pt-3">
                      <p className="text-xs font-medium text-zinc-400 mb-1.5">✦ Enriched</p>
                      <p className="text-sm text-zinc-900 leading-relaxed">{enrichment.content}</p>
                      {enrichment.insights.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {enrichment.insights.map((insight, i) => (
                            <li key={i} className="text-xs text-zinc-600">
                              <span className="font-medium">{insight.title}:</span> {insight.body}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-zinc-100 pt-3">
                      <p className="text-xs text-zinc-400 italic">Enrichment pending...</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function EmptyState({ enriched }: { enriched?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
          {enriched ? <span className="text-base">✦</span> : <Lock className="h-4 w-4 text-zinc-400" />}
        </div>
        <p className="text-sm font-medium text-zinc-900">
          {enriched ? 'No enrichments yet' : 'No private thoughts yet'}
        </p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          {enriched
            ? 'Add private captures and Clout will automatically extract the gold from your thoughts.'
            : 'Use the 🔒 toggle when capturing to keep something just for you.'}
        </p>
        <Link
          href="/capture/new"
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Add your first private thought
        </Link>
      </div>
    </div>
  )
}
