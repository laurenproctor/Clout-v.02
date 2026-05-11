'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import {
  extractHook,
  deriveToneTags,
  estimateTweetCount,
} from './intelligenceUtils'

interface PlatformCardProps {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: () => void
}

export default function XCard({
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
          <span className="text-xs font-semibold uppercase text-zinc-900">X</span>
          <span className="text-xs text-zinc-400">Short-form · conversational · quotable</span>
        </div>
        <span className="text-xs text-zinc-400">~{estimateTweetCount(content)} tweets</span>
      </div>

      {/* Hook */}
      <p className="text-sm font-medium text-zinc-900 leading-snug">{extractHook(content)}</p>

      {/* Full post content */}
      <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-wrap">{content}</p>

      {/* Retention Strategy */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1.5">Retention Strategy</p>
        <div className="flex flex-wrap gap-1.5">
          {intelligence.spreadability_patterns.slice(0, 3).map((pattern, i) => (
            <span key={i} className="bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5 text-xs">
              {pattern}
            </span>
          ))}
        </div>
      </div>

      {/* Tone tags */}
      <div className="flex flex-wrap gap-1.5">
        {deriveToneTags(intelligence.tone).map((tag, i) => (
          <span key={i} className="bg-zinc-100 rounded-full px-2 py-0.5 text-xs text-zinc-600">
            {tag}
          </span>
        ))}
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
          {intelligence.platform_risks['x'] && (
            <p className="text-xs text-zinc-500">{intelligence.platform_risks['x']}</p>
          )}
          {intelligence.persuasive_mechanics.slice(0, 2).map((m, i) => (
            <p key={i} className="text-xs text-zinc-500">• {m}</p>
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
          Regenerate X Version
        </button>
      </div>
    </div>
  )
}
