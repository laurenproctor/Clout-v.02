'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { GOAL_BADGE, GOAL_LABELS } from '@/lib/content/goals'
import type { Campaign, CampaignStatus } from '@/types/domain'

type FilterStatus = 'all' | CampaignStatus

const STATUS_FILTERS: FilterStatus[] = ['all', 'active', 'paused', 'archived']

export default function CampaignsPage() {
  const { slug } = useWorkspace()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/campaigns')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setCampaigns(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = campaigns.filter((c) => filter === 'all' || c.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Strategic objectives that organize your content.
          </p>
        </div>
        <Link
          href={`/${slug}/campaigns/new`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          New campaign
        </Link>
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
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
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Target className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No campaigns yet</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Create a campaign to give your content a strategic objective.
            </p>
            <Link
              href={`/${slug}/campaigns/new`}
              className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              New campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/${slug}/campaigns/${c.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      GOAL_BADGE[c.goal]
                    )}
                  >
                    {GOAL_LABELS[c.goal]}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-900 line-clamp-1">{c.name}</p>
                <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{c.purpose}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                  c.status === 'active' ? 'bg-green-50 text-green-700' :
                  c.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-zinc-100 text-zinc-600'
                )}
              >
                {c.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
