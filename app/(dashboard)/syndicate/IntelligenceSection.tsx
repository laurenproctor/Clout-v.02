'use client'

import type { SyndicationIntelligence, Platform } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS } from '@/lib/syndication/types/intelligence'

interface Props {
  intelligence: SyndicationIntelligence
}

const PLATFORM_DEFAULTS: Record<Platform, string> = {
  x: 'Keep conversational, quotable',
  linkedin: 'Lead with authority and insight',
  substack: 'Build narrative arc and depth',
  blog: 'Structure for scanability',
}

const PLATFORMS: Platform[] = ['x', 'linkedin', 'substack', 'blog']

export function IntelligenceSection({ intelligence }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5 space-y-6">

      {/* Thesis */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-3">What we found</p>
        <p className="text-[15px] font-medium text-zinc-900 leading-relaxed max-w-2xl">{intelligence.thesis}</p>
      </div>

      {/* Three-column intelligence */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 border-t border-zinc-50">
        <div>
          <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-2">Emotional register</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-2">Audience</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {intelligence.audience.length > 120
              ? intelligence.audience.slice(0, 120) + '…'
              : intelligence.audience}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-2">Why it spreads</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {intelligence.spreadability_patterns.slice(0, 3).join(' · ')}
          </p>
        </div>
      </div>

      {/* Platform notes */}
      <div className="pt-5 border-t border-zinc-50">
        <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-4">Platform notes</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PLATFORMS.map(p => (
            <div key={p}>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                {PLATFORM_LABELS[p]}
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {intelligence.platform_risks[p] ?? PLATFORM_DEFAULTS[p]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
