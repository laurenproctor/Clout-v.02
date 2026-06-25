'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LinkedInVariation } from '@/lib/linkedin/types'
import type { ChannelLike } from '@/components/social-preview'
import { VariationCard } from './VariationCard'

interface AlternateAnglesListProps {
  alternates: LinkedInVariation[]
  onChange: (index: number, updated: LinkedInVariation) => void
  linkedInChannelId?: string | null
  channel?: ChannelLike | null
}

// Alternates are explicitly subordinate to the recommended anchor: collapsed by
// default so the result never reads as a competing stack. Expanding one reveals
// the full editable card. Alternates are never auto-saved — each starts unsaved
// and persists only if the user clicks Save/Schedule inside the card.
function AlternateAngleItem({
  variation,
  onChange,
  linkedInChannelId,
  channel,
}: {
  variation: LinkedInVariation
  onChange: (updated: LinkedInVariation) => void
  linkedInChannelId?: string | null
  channel?: ChannelLike | null
}) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-1 px-1 py-1 text-left text-xs font-medium text-zinc-500 hover:text-zinc-700"
        >
          <ChevronRight className="h-3 w-3 rotate-90 transition-transform" />
          {variation.campaignName || variation.label}
        </button>
        <VariationCard
          variation={variation}
          onChange={onChange}
          initialOutputId={null}
          linkedInChannelId={linkedInChannelId}
          channel={channel}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-zinc-300"
    >
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="truncate text-sm text-zinc-600">{variation.campaignName || variation.label}</span>
    </button>
  )
}

export function AlternateAnglesList({ alternates, onChange, linkedInChannelId, channel }: AlternateAnglesListProps) {
  if (alternates.length === 0) return null
  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4">
      <p className="text-xs font-medium text-zinc-400">Alternate angles</p>
      {alternates.map((v, i) => (
        <AlternateAngleItem
          key={v.id}
          variation={v}
          onChange={updated => onChange(i, updated)}
          linkedInChannelId={linkedInChannelId}
          channel={channel}
        />
      ))}
    </div>
  )
}
