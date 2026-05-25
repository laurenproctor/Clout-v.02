'use client'

import { useState } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { estimateReadTime } from './intelligenceUtils'
import { PublishingActions } from '@/components/publishing/PublishingActions'

const REWRITE_VARIANTS = [
  { label: 'More literary', note: 'Elevate the prose. More careful sentence construction, more precise language, stronger narrative arc.' },
  { label: 'More direct', note: 'Cut the editorial indirection. Lead with the claim, build toward it faster, close without ceremony.' },
  { label: 'More narrative', note: 'Strengthen the story structure. More scene-setting, clearer narrative tension, a more satisfying resolution.' },
  { label: 'Sharper', note: 'Make this sharper throughout. Tighter argument, more precise language, stronger editorial control.' },
  { label: 'More emotional', note: 'Deepen the emotional resonance. Make the stakes more personal and the reader investment higher.' },
]

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

export default function SubstackCard({ content, intelligence, onFocus, onCopy, onRegenerate, onSaveDraft, onPublishNow, onSchedule, onQueue, isSaving, isPublishing, savedAt }: Props) {
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
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Substack</span>
          <span className="text-[14px] text-zinc-400">Editorial · immersive · long-form</span>
        </div>
        <span className="text-[14px] text-zinc-400">{estimateReadTime(content)} min read</span>
      </div>

      {/* Post body */}
      <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
        <p className="text-[17px] leading-[1.75] text-zinc-700 whitespace-pre-wrap">{content}</p>
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
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Emotional arc</p>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{intelligence.emotional_style}</p>
              </div>
            )}
            {intelligence.adaptation_constraints.length > 0 && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Preservation constraints</p>
                <div className="space-y-1">
                  {intelligence.adaptation_constraints.slice(0, 2).map((c, i) => (
                    <p key={i} className="text-[14px] text-zinc-500 leading-relaxed">· {c}</p>
                  ))}
                </div>
              </div>
            )}
            {intelligence.platform_risks?.substack && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.substack}</p>
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
