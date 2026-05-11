'use client'

import type { SyndicationIntelligence, Platform } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS } from '@/lib/syndication/types/intelligence'
import {
  deriveEmotionalDrivers,
  deriveAudienceAngles,
} from './intelligenceUtils'

interface Props {
  intelligence: SyndicationIntelligence
}

const PLATFORM_DEFAULTS: Record<Platform, string> = {
  x: 'Keep conversational, quotable',
  linkedin: 'Lead with authority and insight',
  substack: 'Build narrative arc and depth',
  blog: 'Structure for scanability',
}

export function IntelligenceSection({ intelligence }: Props) {
  const emotionalDrivers = deriveEmotionalDrivers(intelligence)
  const audienceAngles = deriveAudienceAngles(intelligence.audience)
  const contentSignals = intelligence.spreadability_patterns.slice(0, 3)
  const platforms: Platform[] = ['x', 'linkedin', 'substack', 'blog']

  return (
    <div className="mb-8 space-y-0">
      {/* Content Intelligence */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Content Intelligence</p>
        <p className="text-lg font-medium text-zinc-900 max-w-2xl mb-6">{intelligence.thesis}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-zinc-400 mb-2">Emotional Drivers</p>
            <div className="flex flex-wrap gap-1.5">
              {emotionalDrivers.map(driver => (
                <span key={driver} className="bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5 text-xs">
                  {driver}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-2">Audience</p>
            <div className="flex flex-wrap gap-1.5">
              {audienceAngles.map(angle => (
                <span key={angle} className="bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5 text-xs">
                  {angle}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-2">Why It Spreads</p>
            <div className="flex flex-wrap gap-1.5">
              {contentSignals.map(signal => (
                <span key={signal} className="border border-zinc-200 bg-white text-zinc-600 rounded-full px-2 py-0.5 text-xs">
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platform notes */}
      <div className="border-t border-zinc-100 pt-6 mt-6">
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Platform Notes</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {platforms.map(platform => (
            <div key={platform} className="rounded-lg border border-zinc-100 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-900 mb-1">
                {PLATFORM_LABELS[platform]}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {intelligence.platform_risks[platform] ?? PLATFORM_DEFAULTS[platform]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
