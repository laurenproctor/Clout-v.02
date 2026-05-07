'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { estimateReadTime } from './intelligenceUtils'

interface PlatformCardProps {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: () => void
}

export default function SubstackCard({
  content,
  intelligence,
  onFocus,
  onCopy,
  onRegenerate,
}: PlatformCardProps) {
  const [showWhy, setShowWhy] = useState(false)

  return (
    <div
      className="rounded-lg border border-zinc-200 p-4 space-y-3 flex flex-col cursor-pointer hover:border-zinc-400 transition-colors"
      onClick={onFocus}
    >
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase text-zinc-900">Substack</span>
          <span className="text-xs text-zinc-400">Editorial · immersive · long-form</span>
        </div>
        <span className="text-xs text-zinc-400">{estimateReadTime(content)} min read</span>
      </div>

      {/* Article Angle + thesis */}
      <div>
        <p className="text-xs text-zinc-400">Article Angle</p>
        <p className="text-sm font-medium text-zinc-900">{intelligence.thesis}</p>
      </div>

      {/* Content preview */}
      <p
        className="text-sm text-zinc-600 leading-relaxed"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 8,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {content}
      </p>

      {/* Narrative Mechanics */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1.5">Narrative Mechanics</p>
        <div className="space-y-1">
          <div className="flex items-start gap-1.5">
            <span className="text-zinc-400 text-xs">✓</span>
            <span className="text-xs text-zinc-600">{intelligence.narrative_style}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-zinc-400 text-xs">✓</span>
            <span className="text-xs text-zinc-600">{intelligence.emotional_style}</span>
          </div>
        </div>
      </div>

      {/* Why this works */}
      <button
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors text-left w-fit"
        onClick={(e) => { e.stopPropagation(); setShowWhy(v => !v) }}
      >
        {showWhy ? 'Why this works ▴' : 'Why this works ▾'}
      </button>
      {showWhy && (
        <div className="space-y-1.5">
          {intelligence.adaptation_constraints.slice(0, 2).map((c, i) => (
            <p key={i} className="text-xs text-zinc-500">• {c}</p>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap pt-1">
        <button
          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onCopy() }}
        >
          Copy
        </button>
        <button
          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onFocus() }}
        >
          Edit
        </button>
        <button
          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onRegenerate() }}
        >
          Regenerate Substack Version
        </button>
      </div>
    </div>
  )
}
