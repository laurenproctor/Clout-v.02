'use client'

import type { Platform, SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS, PLATFORM_DESCRIPTORS } from '@/lib/syndication/types/intelligence'
import XCard from './XCard'
import LinkedInCard from './LinkedInCard'
import SubstackCard from './SubstackCard'
import BlogCard from './BlogCard'

export type CardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; content: string }
  | { status: 'error'; message: string }

interface PlatformGridProps {
  platforms: Platform[]
  cards: Partial<Record<Platform, CardState>>
  intelligence: SyndicationIntelligence | null
  selectedLenses: string[]
  onFocus: (platform: Platform, content: string) => void
  onCopy: (text: string) => void
  onRegenerate: (platform: Platform) => void
}

const SKELETON_BARS: Record<Platform, number> = {
  x: 4,
  linkedin: 6,
  substack: 10,
  blog: 8,
}

export default function PlatformGrid({
  platforms,
  cards,
  intelligence,
  selectedLenses,
  onFocus,
  onCopy,
  onRegenerate,
}: PlatformGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {platforms.map((platform) => {
        const card = cards[platform] ?? { status: 'idle' as const }

        if (card.status === 'idle') return null

        if (card.status === 'loading') {
          const n = SKELETON_BARS[platform]
          return (
            <div key={platform} className="rounded-lg border border-zinc-200 p-4 space-y-2">
              {Array.from({ length: n }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-zinc-100 animate-pulse"
                  style={{ width: i === n - 1 ? '66%' : '100%' }}
                />
              ))}
            </div>
          )
        }

        if (card.status === 'error') {
          return (
            <div key={platform} className="rounded-lg border border-zinc-200 p-4 space-y-2">
              <p className="text-xs text-red-500">{card.message}</p>
              <button
                onClick={() => onRegenerate(platform)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Try again
              </button>
            </div>
          )
        }

        // done
        if (intelligence !== null) {
          const sharedProps = {
            content: card.content,
            intelligence,
            onFocus: () => onFocus(platform, card.content),
            onCopy: () => onCopy(card.content),
            onRegenerate: () => onRegenerate(platform),
          }
          if (platform === 'x') return <XCard key={platform} {...sharedProps} />
          if (platform === 'linkedin') return <LinkedInCard key={platform} {...sharedProps} />
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
              <span className="text-xs font-semibold uppercase text-zinc-900">
                {PLATFORM_LABELS[platform]}
              </span>
              <span className="text-xs text-zinc-400">{PLATFORM_DESCRIPTORS[platform]}</span>
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
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onCopy(card.content) }}
              >
                Copy
              </button>
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onFocus(platform, card.content) }}
              >
                Edit
              </button>
              <button
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
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
