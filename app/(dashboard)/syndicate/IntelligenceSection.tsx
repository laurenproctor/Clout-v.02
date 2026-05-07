'use client'

import type { SyndicationIntelligence, Platform } from '@/lib/syndication/types/intelligence'
import { PLATFORM_LABELS } from '@/lib/syndication/types/intelligence'
import { LENS_CATEGORIES } from '@/lib/syndication/types/lenses'
import {
  deriveEmotionalDrivers,
  deriveAudienceAngles,
  deriveLensImpact,
} from './intelligenceUtils'

interface Props {
  intelligence: SyndicationIntelligence
  selectedLensNames: string[]
}

const PLATFORM_DEFAULTS: Record<Platform, string> = {
  x: 'Keep conversational, quotable',
  linkedin: 'Lead with authority and insight',
  substack: 'Build narrative arc and depth',
  blog: 'Structure for scanability',
}

function getShiftLabel(lensName: string): string {
  for (const category of LENS_CATEGORIES) {
    if ((category.lensNames as string[]).includes(lensName)) {
      if (category.name === 'Interpretation') return 'INTERPRETATION SHIFT'
      if (category.name === 'Narrative') return 'NARRATIVE SHIFT'
      if (category.name === 'Positioning') return 'POSITIONING SHIFT'
    }
  }
  return 'LENS IMPACT'
}

export function IntelligenceSection({ intelligence, selectedLensNames }: Props) {
  const emotionalDrivers = deriveEmotionalDrivers(intelligence)
  const audienceAngles = deriveAudienceAngles(intelligence.audience)
  const contentSignals = intelligence.spreadability_patterns.slice(0, 3)
  const platforms: Platform[] = ['x', 'linkedin', 'substack', 'blog']

  return (
    <div className="mb-8 space-y-0">
      {/* A. Content Intelligence */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Content Intelligence</p>
        <p className="text-lg font-medium text-zinc-900 max-w-2xl mb-6">{intelligence.thesis}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Emotional Drivers */}
          <div>
            <p className="text-xs text-zinc-400 mb-2">Emotional Drivers</p>
            <div className="flex flex-wrap gap-1.5">
              {emotionalDrivers.map(driver => (
                <span
                  key={driver}
                  className="bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5 text-xs"
                >
                  {driver}
                </span>
              ))}
            </div>
          </div>
          {/* Audience Angles */}
          <div>
            <p className="text-xs text-zinc-400 mb-2">Audience Angles</p>
            <div className="flex flex-wrap gap-1.5">
              {audienceAngles.map(angle => (
                <span
                  key={angle}
                  className="bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5 text-xs"
                >
                  {angle}
                </span>
              ))}
            </div>
          </div>
          {/* Content Signals */}
          <div>
            <p className="text-xs text-zinc-400 mb-2">Content Signals</p>
            <div className="flex flex-wrap gap-1.5">
              {contentSignals.map(signal => (
                <span
                  key={signal}
                  className="border border-zinc-200 bg-white text-zinc-600 rounded-full px-2 py-0.5 text-xs"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* B. Platform Adaptation Matrix */}
      <div className="border-t border-zinc-100 pt-6 mt-6">
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Platform Adaptation</p>
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

      {/* C. Lens Impact */}
      {selectedLensNames.length > 0 && (
        <div className="border-t border-zinc-100 pt-6 mt-6">
          <p className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Lens Impact</p>
          <div className="flex flex-wrap gap-4">
            {selectedLensNames.map(lensName => (
              <div key={lensName} className="rounded-lg border border-zinc-100 p-4 space-y-2 min-w-[200px]">
                <p className="text-xs text-zinc-400 uppercase tracking-widest">
                  {getShiftLabel(lensName)}
                </p>
                <p className="text-sm font-semibold text-zinc-900">{lensName}</p>
                <ul className="space-y-1">
                  {deriveLensImpact(lensName).map(item => (
                    <li key={item} className="flex items-start gap-1.5">
                      <span className="text-zinc-400 text-xs mt-0.5">✓</span>
                      <span className="text-xs text-zinc-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
