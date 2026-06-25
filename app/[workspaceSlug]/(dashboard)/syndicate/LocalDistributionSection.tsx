'use client'

import type { CardState } from './PlatformGrid'
import type { PublishState } from './SyndicationClient'
import GoogleBusinessProfileCard from './GoogleBusinessProfileCard'
import { Skeleton } from '@/components/ui/skeleton'

interface GBPChannel {
  id: string
  label: string | null
  google_location_name?: string | null
  google_location_address?: {
    locality?: string
    administrativeArea?: string
  } | null
  google_verified?: boolean | null
}

interface Props {
  gbpCard: CardState | undefined
  gbpChannels: GBPChannel[]
  selectedChannelId: string | null
  publishState?: PublishState
  onSelectChannel: (channelId: string) => void
  onFocus: (content: string) => void
  onCopy: (text: string) => void
  onRegenerate: (variantNote?: string) => void
  onSaveDraft?: () => void
  onPublishNow?: () => void
  onSchedule?: (scheduledAt: Date) => void
  onQueue?: () => void
}

export default function LocalDistributionSection({
  gbpCard,
  gbpChannels,
  selectedChannelId,
  publishState,
  onSelectChannel,
  onFocus,
  onCopy,
  onRegenerate,
  onSaveDraft,
  onPublishNow,
  onSchedule,
  onQueue,
}: Props) {
  const hasChannels = gbpChannels.length > 0
  const hasContent  = gbpCard?.status === 'done' || gbpCard?.status === 'loading' || gbpCard?.status === 'error'

  if (!hasChannels && !hasContent) return null

  const locationOptions = gbpChannels.map(ch => ({
    id:                  ch.id,
    label:               ch.label,
    google_location_name: ch.google_location_name ?? null,
    city:                ch.google_location_address?.locality ?? null,
    state:               ch.google_location_address?.administrativeArea ?? null,
    google_verified:     ch.google_verified ?? false,
  }))

  return (
    <div className="mt-6">
      {/* Section divider */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Local Distribution
        </span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      {/* No channels connected */}
      {!hasChannels && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-zinc-700">Google Business Profile</p>
            <p className="text-[13px] text-zinc-400 mt-0.5">Publish local business updates directly to your Google presence.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth redirect must perform a full document navigation. */}
          <a
            href="/api/channels/google-business-profile/connect"
            className="shrink-0 text-[13px] font-medium text-zinc-600 border border-zinc-300 rounded-lg px-3 py-1.5 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
          >
            Connect →
          </a>
        </div>
      )}

      {/* Loading skeleton */}
      {hasChannels && gbpCard?.status === 'loading' && (
        <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-900">Local Update</span>
            <span className="text-sm text-zinc-400 animate-pulse">Generating local update…</span>
          </div>
          <div className="space-y-2">
            {[100, 85, 70, 55].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {hasChannels && gbpCard?.status === 'error' && (
        <div className="rounded-xl border border-zinc-200 p-4 space-y-2">
          <p className="text-sm text-red-500">{gbpCard.message}</p>
          <button
            onClick={() => onRegenerate()}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content card */}
      {hasChannels && gbpCard?.status === 'done' && (
        <GoogleBusinessProfileCard
          content={gbpCard.content}
          locationOptions={locationOptions}
          selectedChannelId={selectedChannelId}
          onSelectChannel={onSelectChannel}
          onFocus={() => onFocus(gbpCard.content)}
          onCopy={() => onCopy(gbpCard.content)}
          onRegenerate={onRegenerate}
          onSaveDraft={onSaveDraft}
          onPublishNow={onPublishNow}
          onSchedule={onSchedule}
          onQueue={onQueue}
          isSaving={publishState?.isSaving}
          isPublishing={publishState?.isPublishing}
          savedAt={publishState?.savedAt}
        />
      )}
    </div>
  )
}
