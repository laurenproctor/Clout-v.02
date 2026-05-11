'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { truncateAtWord } from './intelligenceUtils'

const SEE_MORE_CHARS = 300

const REWRITE_VARIANTS = [
  { label: 'More executive', note: 'Write for a senior executive audience. More authoritative, less explanatory. Assume high context and strong professional experience.' },
  { label: 'More authority-driven', note: 'Lean heavily into authority and expertise. Every claim should be grounded in specific knowledge or demonstrated experience.' },
  { label: 'Sharper', note: 'Make this sharper. Tighter argument, stronger opening, cleaner close. Cut anything that doesn\'t earn its place.' },
  { label: 'More concise', note: 'Cut this down significantly while preserving the core insight and professional impact.' },
  { label: 'More emotional', note: 'Lead with more emotional resonance. Make the professional stakes feel human and personally relevant.' },
  { label: 'More data-driven', note: 'Ground this in specifics. Numbers, patterns, concrete observations. Replace vague assertions with precise claims.' },
]

function estimateDwellTime(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length
  const seconds = Math.round(words / (200 / 60))
  if (seconds < 90) return `${seconds}s read`
  return `${Math.ceil(seconds / 60)}m read`
}

interface Props {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: (variantNote?: string) => void
}

export default function LinkedInCard({ content, intelligence, onFocus, onCopy, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showVariants, setShowVariants] = useState(false)

  const needsTruncation = content.length > SEE_MORE_CHARS
  const displayContent = needsTruncation && !expanded
    ? content.slice(0, SEE_MORE_CHARS).trimEnd()
    : content

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">LinkedIn</span>
          <span className="text-[14px] text-zinc-400">Professional · authority-driven</span>
        </div>
        <span className="text-[14px] text-zinc-400">{estimateDwellTime(content)}</span>
      </div>

      {/* Post body */}
      <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
        <p className="text-[17px] leading-[1.75] text-zinc-800 whitespace-pre-wrap">
          {displayContent}
          {needsTruncation && !expanded && (
            <>
              {'… '}
              <button
                className="text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
                onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
              >
                see more
              </button>
            </>
          )}
        </p>
      </div>

      {/* Intelligence layer */}
      <div className="border-t border-zinc-100">
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowInsights(v => !v) }}
        >
          <span className="text-[14px] text-zinc-400">Why this may perform well</span>
          <span className="text-[14px] text-zinc-300">{showInsights ? '▴' : '▾'}</span>
        </button>

        {showInsights && (
          <div className="px-5 pb-5 space-y-4 border-t border-zinc-50">
            {intelligence.authority_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Authority dynamics</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.authority_style}</p>
              </div>
            )}
            {intelligence.emotional_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Emotional register</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
              </div>
            )}
            {intelligence.persuasive_mechanics.length > 0 && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Persuasive mechanics</p>
                <div className="space-y-1">
                  {intelligence.persuasive_mechanics.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-[14px] text-zinc-500 leading-relaxed">· {m}</p>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Audience</p>
              <p className="text-[14px] text-zinc-400 leading-relaxed">{truncateAtWord(intelligence.audience, 80)}</p>
            </div>
            {intelligence.platform_risks?.linkedin && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.linkedin}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="text-[14px] font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleCopy() }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <span className="text-zinc-200 text-sm select-none">·</span>
          <button
            className="text-[14px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onFocus() }}
          >
            Edit
          </button>
          <span className="text-zinc-200 text-sm select-none">·</span>
          <button
            className="text-[14px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onRegenerate() }}
          >
            Regenerate
          </button>
          <span className="text-zinc-200 text-sm select-none">·</span>
          <button
            className="text-[14px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowVariants(v => !v) }}
          >
            Rewrite as {showVariants ? '▴' : '▾'}
          </button>
        </div>

        {showVariants && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-50">
            {REWRITE_VARIANTS.map(v => (
              <button
                key={v.label}
                onClick={(e) => { e.stopPropagation(); setShowVariants(false); onRegenerate(v.note) }}
                className="text-[14px] font-medium text-zinc-500 border border-zinc-200 rounded-full px-2.5 py-1 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
