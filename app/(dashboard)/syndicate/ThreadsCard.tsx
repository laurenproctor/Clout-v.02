'use client'

import { useState, useMemo } from 'react'
import type { SyndicationIntelligence } from '@/lib/syndication/types/intelligence'
import { scoreHumanity } from '@/lib/syndication/scoring/humanity'
import { validateThreadsPost } from '@/lib/syndication/validation/threads'
import { deriveToneTags } from './intelligenceUtils'
import { PublishingActions } from '@/components/publishing/PublishingActions'

const THREADS_MAX = 500
const THREADS_WARN = 400

const REWRITE_VARIANTS = [
  { label: 'More personal', note: 'Make this more personal and first-person. Write like you\'re sharing a genuine observation, not publishing content.' },
  { label: 'Shorter', note: 'Cut this significantly. One sharp thought, minimum words. Under 150 characters if possible.' },
  { label: 'More provocative', note: 'Make this more provocative. Challenge something the reader assumes. The post should create mild friction.' },
  { label: 'Add a question', note: 'Rewrite to end on an open question — not a generic "what do you think?" but something specific and genuinely curious.' },
  { label: 'Remove the CTA', note: 'Strip any call to action, link reference, or promotional intent. Make it a pure observation.' },
  { label: 'Thread opener', note: 'Rewrite as the opening post of a thread — a hook that makes someone want to read what comes next.' },
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

export default function ThreadsCard({ content, intelligence, onFocus, onCopy, onRegenerate, onSaveDraft, onPublishNow, onSchedule, onQueue, isSaving, isPublishing, savedAt }: Props) {
  const [copied, setCopied] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showVariants, setShowVariants] = useState(false)
  const [threadMode, setThreadMode] = useState(false)

  const charCount = content.length
  const toneTags = deriveToneTags(intelligence.tone).slice(0, 2)
  const humanity = useMemo(() => scoreHumanity(content), [content])
  const validation = useMemo(() => validateThreadsPost(content), [content])

  // Thread preview: split on double newlines
  const threadPosts = useMemo(() =>
    content.split(/\n\n+/).map(p => p.trim()).filter(Boolean),
    [content],
  )

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
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Threads</span>
          <span className="text-[14px] text-zinc-400">Social · conversational · reply-native</span>
        </div>
        <div className="flex items-center gap-2">
          {toneTags.map(tag => (
            <span key={tag} className="text-[14px] text-zinc-400 border border-zinc-100 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
          <span
            className={`text-[14px] tabular-nums ml-1 ${charCount > THREADS_MAX ? 'text-red-500' : charCount > THREADS_WARN ? 'text-amber-500' : 'text-zinc-400'}`}
          >
            {charCount} / {THREADS_MAX}
          </span>
        </div>
      </div>

      {/* Humanity score + validation hints */}
      {(humanity.flags.length > 0 || validation.qualityWarnings.length > 0 || validation.platformRisks.length > 0 || validation.technicalErrors.length > 0) && (
        <div className="px-5 pb-3 space-y-1.5">
          {validation.technicalErrors.map((e, i) => (
            <p key={i} className="text-[13px] text-red-500">⚠ {e}</p>
          ))}
          {validation.platformRisks.map((r, i) => (
            <p key={i} className="text-[13px] text-orange-500">· {r}</p>
          ))}
          {validation.qualityWarnings.map((w, i) => (
            <p key={i} className="text-[13px] text-amber-600">· {w}</p>
          ))}
          {humanity.score < 60 && humanity.flags.length > 0 && (
            <p className="text-[13px] text-zinc-400">
              <span className="text-zinc-500">Voice signal: </span>
              {humanity.flags.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Thread mode toggle */}
      {threadPosts.length > 1 && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <button
            onClick={() => setThreadMode(false)}
            className={`text-[13px] px-2.5 py-0.5 rounded-full transition-colors ${!threadMode ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Single
          </button>
          <button
            onClick={() => setThreadMode(true)}
            className={`text-[13px] px-2.5 py-0.5 rounded-full transition-colors ${threadMode ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Thread ({threadPosts.length} posts)
          </button>
        </div>
      )}

      {/* Post body */}
      {!threadMode ? (
        <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
          <p className="text-[17px] leading-[1.75] text-zinc-900 whitespace-pre-wrap">
            {content}
          </p>
        </div>
      ) : (
        <div className="px-5 pb-6 space-y-4">
          {threadPosts.map((post, i) => (
            <div key={i} className="border border-zinc-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-zinc-400 font-medium">{i + 1} / {threadPosts.length}</span>
                <span className={`text-[12px] tabular-nums ${post.length > THREADS_MAX ? 'text-red-500' : post.length > THREADS_WARN ? 'text-amber-500' : 'text-zinc-400'}`}>
                  {post.length} chars
                </span>
              </div>
              <p className="text-[15px] leading-[1.65] text-zinc-900 whitespace-pre-wrap">{post}</p>
            </div>
          ))}
        </div>
      )}

      {/* Intelligence layer */}
      <div className="border-t border-zinc-100">
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowInsights(v => !v) }}
        >
          <span className="text-[14px] text-zinc-400">Why this may work on Threads</span>
          <span className="text-[14px] text-zinc-300">{showInsights ? '▴' : '▾'}</span>
        </button>

        {showInsights && (
          <div className="px-5 pb-5 space-y-4 border-t border-zinc-50">
            {intelligence.narrative_style && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Hook quality</p>
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
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Reply potential</p>
                <div className="space-y-1">
                  {intelligence.spreadability_patterns.slice(0, 2).map((p, i) => (
                    <p key={i} className="text-[14px] text-zinc-500 leading-relaxed">· {p}</p>
                  ))}
                </div>
              </div>
            )}
            {intelligence.platform_risks?.threads && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Adaptation note</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{intelligence.platform_risks.threads}</p>
              </div>
            )}
            {humanity.score >= 60 && (
              <div>
                <p className="text-[14px] uppercase tracking-[0.12em] text-zinc-300 mb-1.5">Voice signal</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed">
                  Humanity score: {humanity.score}/100
                  {humanity.flags.length > 0 && ` · ${humanity.flags.join(', ')}`}
                </p>
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
