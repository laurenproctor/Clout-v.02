'use client'

import type { Platform, SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS, PLATFORM_DESCRIPTORS } from '@/lib/syndication/types/intelligence'
import { SkeletonText } from '@/components/ui/skeleton'
import XCard from './XCard'
import LinkedInCard from './LinkedInCard'
import SubstackCard from './SubstackCard'
import BlogCard from './BlogCard'
import ThreadsCard from './ThreadsCard'
import FacebookCard from './FacebookCard'
import type { PublishState } from './SyndicationClient'

export type CardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; content: string }
  | { status: 'error'; message: string }

interface ChannelOption {
  id: string
  label: string | null
  account_type: string
}

interface PlatformGridProps {
  platforms: Platform[]
  cards: Partial<Record<Platform, CardState>>
  intelligence: SyndicationIntelligence | null
  onFocus: (platform: Platform, content: string) => void
  onCopy: (text: string) => void
  onRegenerate: (platform: Platform, variantNote?: string) => void
  onSaveDraft?: (platform: Platform) => void
  onPublishNow?: (platform: Platform) => void
  onSchedule?: (platform: Platform, scheduledAt: Date) => void
  onQueue?: (platform: Platform) => void
  publishState?: Partial<Record<Platform, PublishState>>
  channelAccounts?: Partial<Record<Platform, ChannelOption[]>>
  selectedChannelId?: Partial<Record<Platform, string>>
  onSelectChannel?: (platform: Platform, channelId: string) => void
}

const SKELETON_BARS: Record<Platform, number> = {
  x: 4,
  linkedin: 6,
  substack: 10,
  blog: 8,
  threads: 4,
  facebook: 6,
  google_business_profile: 4,
  medium: 10,
  bluesky: 3,
  mastodon: 3,
}

const FULL_WIDTH_PLATFORMS: Platform[] = ['x', 'linkedin', 'threads', 'facebook']

export default function PlatformGrid({
  platforms,
  cards,
  intelligence,
  onFocus,
  onCopy,
  onRegenerate,
  onSaveDraft,
  onPublishNow,
  onSchedule,
  onQueue,
  publishState,
  channelAccounts,
  selectedChannelId,
  onSelectChannel,
}: PlatformGridProps) {

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {platforms.map((platform) => {
        const card = cards[platform] ?? { status: 'idle' as const }
        const ps = publishState?.[platform]

        if (card.status === 'idle') return null

        if (card.status === 'loading') {
          const n = SKELETON_BARS[platform]
          return (
            <div key={platform} className={FULL_WIDTH_PLATFORMS.includes(platform) ? 'col-span-full' : ''}>
              <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold uppercase text-zinc-900">{PLATFORM_LABELS[platform]}</span>
                  </div>
                  <span className="text-sm text-zinc-400 animate-pulse">Generating new version…</span>
                </div>
                <SkeletonText lines={n} />
              </div>
            </div>
          )
        }

        if (card.status === 'error') {
          return (
            <div key={platform} className="rounded-lg border border-zinc-200 p-4 space-y-2">
              <p className="text-sm text-red-500">{card.message}</p>
              <button
                onClick={() => onRegenerate(platform)}
                className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Try again
              </button>
            </div>
          )
        }

        // Build publishing callbacks scoped to this platform
        const publishingProps = {
          onSaveDraft: onSaveDraft ? () => onSaveDraft(platform) : undefined,
          onPublishNow: onPublishNow ? () => onPublishNow(platform) : undefined,
          onSchedule: onSchedule ? (d: Date) => onSchedule(platform, d) : undefined,
          onQueue: onQueue ? () => onQueue(platform) : undefined,
          isSaving: ps?.isSaving,
          isPublishing: ps?.isPublishing,
          savedAt: ps?.savedAt ?? undefined,
        }

        // done
        if (intelligence !== null) {
          const sharedProps = {
            content: card.content,
            intelligence,
            onFocus: () => onFocus(platform, card.content),
            onCopy: () => onCopy(card.content),
            onRegenerate: (variantNote?: string) => onRegenerate(platform, variantNote),
            ...publishingProps,
          }

          const accounts = channelAccounts?.[platform] ?? []
          const selId = selectedChannelId?.[platform] ?? accounts[0]?.id
          const accountSelector = accounts.length > 1 ? (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-zinc-400">Post from:</span>
              <select
                value={selId ?? ''}
                onChange={e => onSelectChannel?.(platform, e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.label ?? a.id}{a.account_type !== 'personal' ? ` (${a.account_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null

          if (platform === 'x') return <div key={platform} className="col-span-full">{accountSelector}<XCard {...sharedProps} /></div>
          if (platform === 'linkedin') return <div key={platform} className="col-span-full">{accountSelector}<LinkedInCard {...sharedProps} /></div>
          if (platform === 'threads') return <div key={platform} className="col-span-full">{accountSelector}<ThreadsCard {...sharedProps} /></div>
          if (platform === 'facebook') return <div key={platform} className="col-span-full">{accountSelector}<FacebookCard {...sharedProps} /></div>
          if (platform === 'substack') return <SubstackCard key={platform} {...sharedProps} />
          if (platform === 'blog') return <BlogCard key={platform} {...sharedProps} />
        }

        // done but no intelligence — simple fallback
        return (
          <div
            key={platform}
            className="rounded-lg border border-zinc-200 p-4 space-y-3 flex flex-col cursor-pointer hover:border-zinc-400 transition-colors"
            onClick={() => onFocus(platform, card.content)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold uppercase text-zinc-900">
                {PLATFORM_LABELS[platform]}
              </span>
              <span className="text-sm text-zinc-400">{PLATFORM_DESCRIPTORS[platform]}</span>
            </div>

            <p
              className="text-sm text-zinc-600 leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {card.content}
            </p>

            <div className="flex gap-2 flex-wrap pt-1">
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onCopy(card.content) }}
              >
                Copy
              </button>
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onFocus(platform, card.content) }}
              >
                Edit
              </button>
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onRegenerate(platform) }}
              >
                Regenerate
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
