'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'

interface PlatformCardProps {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: () => void
}

export default function BlogCard({
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
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase text-zinc-900">Blog</span>
        <span className="text-xs text-zinc-400">Structured · evergreen · searchable</span>
      </div>

      {/* Article Premise + thesis */}
      <div>
        <p className="text-xs text-zinc-400">Article Premise</p>
        <p className="text-sm font-medium text-zinc-900">{intelligence.thesis}</p>
      </div>

      {/* Information Architecture — BEFORE prose preview */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1.5">Information Architecture</p>
        <div className="space-y-1">
          <div className="flex items-start gap-1.5">
            <span className="text-zinc-400 text-xs">✓</span>
            <span className="text-xs text-zinc-600">{intelligence.authority_style}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-zinc-400 text-xs">✓</span>
            <span className="text-xs text-zinc-600">{intelligence.adaptation_constraints[0] ?? ''}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-zinc-400 text-xs">✓</span>
            <span className="text-xs text-zinc-600">{intelligence.narrative_style}</span>
          </div>
        </div>
      </div>

      {/* Prose preview — de-emphasized */}
      <p
        className="text-sm text-zinc-500 leading-relaxed"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {content}
      </p>

      {/* Why this works */}
      <button
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors text-left w-fit"
        onClick={(e) => { e.stopPropagation(); setShowWhy(v => !v) }}
      >
        {showWhy ? 'Why this works ▴' : 'Why this works ▾'}
      </button>
      {showWhy && (
        <div className="space-y-1.5">
          {intelligence.adaptation_constraints.slice(0, 3).map((c, i) => (
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
          Regenerate Blog Version
        </button>
      </div>
    </div>
  )
}
