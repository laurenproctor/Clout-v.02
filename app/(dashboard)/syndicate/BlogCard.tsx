'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'

const REWRITE_VARIANTS = [
  { label: 'More SEO-focused', note: 'Optimize for search intent. Clearer structure, better keyword integration, stronger meta-appeal for a search audience.' },
  { label: 'More structured', note: 'Improve the information architecture. Cleaner hierarchy, more scannable sections, better use of structure to carry argument.' },
  { label: 'Sharper', note: 'Make this sharper. Tighter thesis, cleaner transitions, stronger conclusion.' },
  { label: 'More technical', note: 'Increase technical precision. More specificity, fewer generalizations, more accurate terminology.' },
  { label: 'More concise', note: 'Cut aggressively. Preserve the argument, remove everything else.' },
]

interface Props {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: (variantNote?: string) => void
}

export default function BlogCard({ content, intelligence, onFocus, onCopy, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showVariants, setShowVariants] = useState(false)

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
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Blog</span>
          <span className="text-[11px] text-zinc-400">Structured · evergreen · searchable</span>
        </div>
      </div>

      {/* Post body */}
      <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
        <p className="text-[14px] leading-[1.75] text-zinc-700 whitespace-pre-wrap">{content}</p>
      </div>

      {/* Intelligence layer */}
      <div className="border-t border-zinc-100">
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowInsights(v => !v) }}
        >
          <span className="text-[11px] text-zinc-400">Why this may perform well</span>
          <span className="text-[9px] text-zinc-300">{showInsights ? '▴' : '▾'}</span>
        </button>

        {showInsights && (
          <div className="px-5 pb-5 space-y-4 border-t border-zinc-50">
            {intelligence.authority_style && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Information architecture</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{intelligence.authority_style}</p>
              </div>
            )}
            {intelligence.narrative_style && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Structural logic</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{intelligence.narrative_style}</p>
              </div>
            )}
            {intelligence.adaptation_constraints.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Preservation constraints</p>
                <div className="space-y-1">
                  {intelligence.adaptation_constraints.slice(0, 2).map((c, i) => (
                    <p key={i} className="text-[11px] text-zinc-500 leading-relaxed">· {c}</p>
                  ))}
                </div>
              </div>
            )}
            {intelligence.platform_risks?.blog && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.blog}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="text-[11px] font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleCopy() }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <span className="text-zinc-200 text-xs select-none">·</span>
          <button
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onFocus() }}
          >
            Edit
          </button>
          <span className="text-zinc-200 text-xs select-none">·</span>
          <button
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onRegenerate() }}
          >
            Regenerate
          </button>
          <span className="text-zinc-200 text-xs select-none">·</span>
          <button
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
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
                className="text-[10px] font-medium text-zinc-500 border border-zinc-200 rounded-full px-2.5 py-1 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
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
