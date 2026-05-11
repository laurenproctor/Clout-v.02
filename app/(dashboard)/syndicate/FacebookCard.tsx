'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { truncateAtWord } from './intelligenceUtils'

const SEE_MORE_CHARS = 250

const REWRITE_VARIANTS = [
  { label: 'More personal', note: 'Lean into first-person narrative and personal reaction. The post should feel like sharing your own experience or response to this idea, not reporting on it.' },
  { label: 'More Page-ready', note: 'Shift toward a brand or creator Page voice. Make it slightly shorter (aim for 80–150 words), more benefit-focused, and appropriate for a business or creator posting to followers — still warm, but less personally narrative.' },
  { label: 'Shorter / punchier', note: 'Tighten this to under 150 words. Cut any setup that doesn\'t earn its place. Every sentence must do work.' },
  { label: 'Add engagement question', note: 'End with a specific, genuine question that invites the reader\'s own experience or opinion. Not a CTA — a real conversational opening that makes someone want to respond.' },
  { label: 'More conversational', note: 'Bring the register down. Casual sentence rhythm, natural word choice, reads like a real person talking to friends. No formality, no polish signals.' },
  { label: 'More emotional', note: 'Lead with emotional stakes and personal resonance. Make the human dimension immediate before the argument or insight lands.' },
]

function wordCount(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length
  return `${words} words`
}

interface Props {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: (variantNote?: string) => void
}

export default function FacebookCard({ content, intelligence, onFocus, onCopy, onRegenerate }: Props) {
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
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Facebook</span>
          <span className="text-[14px] text-zinc-400">Personal · story-driven · conversation-first</span>
        </div>
        <span className="text-[14px] text-zinc-400">{wordCount(content)}</span>
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
            {intelligence.narrative_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Narrative structure</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.narrative_style}</p>
              </div>
            )}
            {intelligence.emotional_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Emotional register</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
              </div>
            )}
            {intelligence.spreadability_patterns.length > 0 && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Engagement mechanics</p>
                <div className="space-y-1">
                  {intelligence.spreadability_patterns.slice(0, 3).map((p, i) => (
                    <p key={i} className="text-[14px] text-zinc-500 leading-relaxed">· {p}</p>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Audience</p>
              <p className="text-[14px] text-zinc-400 leading-relaxed">{truncateAtWord(intelligence.audience, 80)}</p>
            </div>
            {intelligence.platform_risks?.facebook && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.facebook}</p>
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
