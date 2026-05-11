'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { deriveToneTags } from './intelligenceUtils'
import { PublishingActions } from '@/components/publishing/PublishingActions'

const REWRITE_VARIANTS = [
  { label: 'Sharper', note: 'Make this sharper and more direct. Cut anything that doesn\'t earn its place. Every word must justify itself.' },
  { label: 'More contrarian', note: 'Take a more contrarian angle. Challenge the expected take. The post should push back on consensus.' },
  { label: 'More concise', note: 'Cut this down significantly. One sharp idea, minimum words, maximum punch.' },
  { label: 'More emotional', note: 'Lead with more emotional weight. Make the human stakes immediate and visible.' },
  { label: 'More analytical', note: 'Lean into precision and intellectual rigor. Structure the argument more carefully.' },
  { label: 'More viral', note: 'Optimize aggressively for shareability. The hook must stop scrolling. The post must create a desire to repost.' },
]

function xCharCount(content: string): number {
  return content.replace(/https?:\/\/[^\s]+/g, 'x'.repeat(23)).length
}

interface Props {
  content: string
  intelligence: SyndicationIntelligence
  onFocus: () => void
  onCopy: () => void
  onRegenerate: (variantNote?: string) => void
  onSaveDraft?: () => void
  onPublishNow?: () => void
  onSchedule?: (scheduledAt: Date) => void
  onQueue?: () => void
  isSaving?: boolean
  isPublishing?: boolean
  savedAt?: Date | null
}

export default function XCard({ content, intelligence, onFocus, onCopy, onRegenerate, onSaveDraft, onPublishNow, onSchedule, onQueue, isSaving, isPublishing, savedAt }: Props) {
  const [copied, setCopied] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showVariants, setShowVariants] = useState(false)

  const charCount = xCharCount(content)
  const toneTags = deriveToneTags(intelligence.tone).slice(0, 2)

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
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">X</span>
          <span className="text-[14px] text-zinc-400">Short-form · conversational · quotable</span>
        </div>
        <div className="flex items-center gap-2">
          {toneTags.map(tag => (
            <span key={tag} className="text-[14px] text-zinc-400 border border-zinc-100 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
          <span className={`text-[14px] tabular-nums ml-1 ${charCount > 280 ? 'text-amber-500' : 'text-zinc-400'}`}>
            {charCount} chars
          </span>
        </div>
      </div>

      {/* Post body */}
      <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
        <p className="text-[17px] leading-[1.65] text-zinc-900 whitespace-pre-wrap">
          {content}
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
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Hook structure</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.narrative_style}</p>
              </div>
            )}
            {intelligence.emotional_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Emotional dynamics</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
              </div>
            )}
            {intelligence.spreadability_patterns.length > 0 && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Retention mechanics</p>
                <div className="space-y-1">
                  {intelligence.spreadability_patterns.slice(0, 3).map((p, i) => (
                    <p key={i} className="text-[14px] text-zinc-500 leading-relaxed">· {p}</p>
                  ))}
                </div>
              </div>
            )}
            {intelligence.platform_risks?.x && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.x}</p>
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

      {onSaveDraft && (
        <PublishingActions
          onSaveDraft={onSaveDraft}
          onPublishNow={onPublishNow!}
          onSchedule={onSchedule!}
          onQueue={onQueue!}
          isSaving={isSaving}
          isPublishing={isPublishing}
          savedAt={savedAt}
        />
      )}
    </div>
  )
}
