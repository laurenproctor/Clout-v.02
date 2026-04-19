'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'raw' | 'enriched'

const SAMPLE_TAGS = ['All', 'Work', 'Passions', 'Love', 'Health', 'Growth']

export default function PrivatePage() {
  const [activeTab, setActiveTab] = useState<Tab>('raw')
  const [activeTag, setActiveTag] = useState('All')

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
          href="/capture"
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

      {/* Feed content */}
      {activeTab === 'raw' ? (
        <RawFeed activeTag={activeTag} />
      ) : (
        <EnrichedFeed activeTag={activeTag} />
      )}
    </div>
  )
}

function RawFeed({ activeTag }: { activeTag: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
          <Lock className="h-4 w-4 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-900">No private thoughts yet</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Your private thoughts will appear here. Use the{' '}
          <Lock className="inline h-3 w-3" /> toggle when capturing to keep
          something just for you.
        </p>
        <Link
          href="/capture"
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Add your first private thought
        </Link>
      </div>
    </div>
  )
}

function EnrichedFeed({ activeTag }: { activeTag: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
          <span className="text-base">✦</span>
        </div>
        <p className="text-sm font-medium text-zinc-900">No enrichments yet</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          When you capture private thoughts, Clout automatically extracts the
          gold — surfacing insights from your own mental models and
          philosophies.
        </p>
      </div>
    </div>
  )
}
