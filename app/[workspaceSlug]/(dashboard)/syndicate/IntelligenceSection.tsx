'use client'

import type { SyndicationIntelligence, Platform } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS } from '@/lib/syndication/types/intelligence'

interface Props {
  intelligence: SyndicationIntelligence
}

const PLATFORM_DEFAULTS: Record<Platform, string> = {
  x: 'Open with the sharpest claim; end with the most quotable line',
  linkedin: 'Lead with the professional implication before the argument',
  substack: 'Open with the tension that makes this urgent; let the argument unfold',
  blog: 'Lead with the searchable question this answers; use headers to signal structure',
  threads: 'Open with a single personal observation; let it breathe',
  facebook: 'Open with a personal story hook in the first 250 characters; end with a question that invites the reader\'s own experience',
  google_business_profile: 'Lead with the operational fact; keep it under 300 characters; no hashtags',
  medium: 'State the thesis in the first two sentences; earn it over the full piece',
}

const PLATFORMS: Platform[] = ['x', 'linkedin', 'threads', 'substack', 'blog', 'facebook']

export function IntelligenceSection({ intelligence }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5 space-y-6">

      {/* Thesis */}
      <div>
        <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-3">What we found</p>
        <p className="text-[15px] font-medium text-zinc-900 leading-relaxed max-w-2xl">{intelligence.thesis}</p>
      </div>

      {/* Three-column intelligence */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 border-t border-zinc-50">
        <div>
          <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-2">Emotional register</p>
          <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
        </div>
        <div>
          <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-2">Audience</p>
          <p className="text-[14px] text-zinc-500 leading-relaxed">
            {intelligence.audience.length > 120
              ? intelligence.audience.slice(0, 120) + '…'
              : intelligence.audience}
          </p>
        </div>
        <div>
          <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-2">Why it spreads</p>
          <p className="text-[14px] text-zinc-500 leading-relaxed">
            {intelligence.spreadability_patterns.slice(0, 3).join(' · ')}
          </p>
        </div>
      </div>

      {/* Platform notes */}
      <div className="pt-5 border-t border-zinc-50">
        <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-4">Platform notes</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PLATFORMS.map(p => (
            <div key={p}>
              <p className="text-[14px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                {PLATFORM_LABELS[p]}
              </p>
              <p className="text-[14px] text-zinc-400 leading-relaxed">
                {intelligence.platform_risks[p] ?? PLATFORM_DEFAULTS[p]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
