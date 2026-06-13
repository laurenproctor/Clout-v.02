'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { GOAL_BADGE, GOAL_LABELS } from '@/lib/content/goals'
import { CampaignEditForm } from '@/components/campaigns/CampaignEditForm'
import type { Campaign, Output, OutputContent } from '@/types/domain'
import { Skeleton } from '@/components/ui/skeleton'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CampaignCommandCenterPage() {
  const { id } = useParams<{ id: string }>()
  const { slug } = useWorkspace()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/campaigns/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/outputs?campaign_id=${id}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([c, o]) => {
        if (!active) return
        if (!c) { setNotFound(true); setLoading(false); return }
        setCampaign(c)
        setOutputs(Array.isArray(o) ? o : [])
        setLoading(false)
      })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  // Lightweight orientation counts (not full analytics).
  const total = outputs.length
  const draftCount = outputs.filter((o) => o.status === 'draft').length
  const publishedCount = outputs.filter((o) => o.status === 'published').length
  const latest = outputs.reduce<string | null>((acc, o) => {
    const d = o.publishedAt ?? o.createdAt
    return !acc || new Date(d) > new Date(acc) ? d : acc
  }, null)

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    )
  }

  if (notFound || !campaign) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-zinc-500">Campaign not found.</p>
        <Link href={`/${slug}/campaigns`} className="mt-2 inline-block text-sm text-zinc-900 underline">
          Back to campaigns
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/campaigns`} className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">{campaign.name}</h1>
        <span
          className={cn(
            'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            GOAL_BADGE[campaign.goal]
          )}
        >
          {GOAL_LABELS[campaign.goal]}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            campaign.status === 'active' ? 'bg-green-50 text-green-700' :
            campaign.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
            'bg-zinc-100 text-zinc-600'
          )}
        >
          {campaign.status}
        </span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit campaign
          </button>
        )}
      </div>

      {editing ? (
        <CampaignEditForm
          campaign={campaign}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => { setCampaign(updated); setEditing(false) }}
        />
      ) : (
        <>
          {/* Purpose */}
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">{campaign.purpose}</p>

          {/* Orientation counts */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: String(total) },
              { label: 'Drafts', value: String(draftCount) },
              { label: 'Published', value: String(publishedCount) },
              { label: 'Latest', value: latest ? formatDate(latest) : '—' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <p className="text-lg font-semibold text-zinc-900">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div>
            <Link
              href={`/${slug}/create?campaign=${campaign.id}`}
              className="inline-block rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Create content for this campaign
            </Link>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Content</p>
            {outputs.length === 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-white px-5 py-12 text-center">
                <p className="text-sm font-medium text-zinc-900">No content yet for this campaign</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Create the first draft using this campaign&apos;s strategic goal and purpose.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
                {outputs.map((output) => (
                  <Link
                    key={output.id}
                    href={`/${slug}/studio/${output.id}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-zinc-900">
                        {output.title ?? 'Untitled output'}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                        {(output.content as OutputContent).body?.slice(0, 120) ?? ''}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                        output.status === 'published' ? 'bg-green-50 text-green-700' :
                        output.status === 'approved' ? 'bg-green-50 text-green-700' :
                        output.status === 'review' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-zinc-100 text-zinc-600'
                      )}
                    >
                      {output.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
