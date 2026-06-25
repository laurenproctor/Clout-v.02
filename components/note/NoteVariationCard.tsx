'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink } from 'lucide-react'
import type { NoteVariation, NoteRegister } from '@/lib/note/types'
import { SocialPreviewInline, previewFromStudioState } from '@/components/social-preview'

const WORD_TARGET_MIN = 50
const WORD_TARGET_MAX = 200

const REGISTER_LABELS: Record<NoteRegister, string> = {
  observation:  'Observation',
  insight:      'Insight',
  provocation:  'Provocation',
  story:        'Story',
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  threads:  'Threads',
  bluesky:  'Bluesky',
  x:        'X',
  twitter:  'X',
  mastodon: 'Mastodon',
}

type ConnectedChannel = {
  id: string
  platform: string
  label?: string | null
  profile_image_url?: string | null
  config?: Record<string, unknown> | null
}

interface Props {
  variation: NoteVariation
  onChange: (updated: NoteVariation) => void
  initialOutputId?: string | null
  channels: ConnectedChannel[]
}

type SaveState    = 'idle' | 'saving' | 'saved' | 'error'
type CrosspostState = 'idle' | 'posting' | 'done' | 'error'
type CopyState = 'idle' | 'copied'

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const actionBtn = 'text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded hover:bg-zinc-100'

const CROSSPOST_PLATFORMS = ['linkedin', 'threads', 'bluesky', 'x', 'twitter', 'mastodon']

export function NoteVariationCard({ variation, onChange, initialOutputId, channels }: Props) {
  const [saveState, setSaveState]         = useState<SaveState>('idle')
  const [savedOutputId, setSavedOutputId] = useState<string | null>(initialOutputId ?? null)
  const [crosspostState, setCrosspostState] = useState<Record<string, CrosspostState>>({})
  const [copyState, setCopyState]         = useState<CopyState>('idle')
  const textareaRef                       = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialOutputId && !savedOutputId) {
      setSavedOutputId(initialOutputId)
      if (saveState === 'idle') setSaveState('saved')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOutputId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(100, el.scrollHeight)}px`
  }, [variation.body])

  const wordCount = countWords(variation.body)
  const wordWarning = wordCount < WORD_TARGET_MIN || wordCount > WORD_TARGET_MAX

  const substackChannel = channels.find(c => c.platform === 'substack') ?? null
  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: 'substack',
        channel: substackChannel,
        body: variation.body,
      }),
    [substackChannel, variation.body],
  )

  async function handleSaveDraft() {
    setSaveState('saving')
    try {
      if (savedOutputId) {
        await fetch(`/api/outputs/${savedOutputId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            content: { body: variation.body, register: variation.register, wordCount: variation.wordCount },
          }),
        })
        setSaveState('saved')
      } else {
        const res = await fetch('/api/note/outputs', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            variation: { body: variation.body, register: variation.register, wordCount: variation.wordCount },
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { id: string }
        setSavedOutputId(data.id)
        setSaveState('saved')
      }
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  async function handleCopySubstack() {
    try {
      await navigator.clipboard.writeText(variation.body)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2500)
    } catch {
      // clipboard API not available
    }
  }

  async function handleCrosspost(channelId: string, platform: string) {
    if (!savedOutputId) return
    setCrosspostState(prev => ({ ...prev, [channelId]: 'posting' }))
    try {
      const res = await fetch('/api/note/crosspost', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ noteOutputId: savedOutputId, platform, channelId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCrosspostState(prev => ({ ...prev, [channelId]: 'done' }))
    } catch {
      setCrosspostState(prev => ({ ...prev, [channelId]: 'error' }))
      setTimeout(() => setCrosspostState(prev => ({ ...prev, [channelId]: 'idle' })), 4000)
    }
  }

  const crosspostChannels = channels.filter(c => CROSSPOST_PLATFORMS.includes(c.platform))

  return (
    <div className="border border-zinc-200 rounded-xl p-5 space-y-4 bg-white">
      {/* Live preview */}
      <SocialPreviewInline data={previewData} outputId={savedOutputId ?? null} label="Preview" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 border border-zinc-100 rounded-full px-2.5 py-0.5">
          {REGISTER_LABELS[variation.register]}
        </span>
        <div className="flex items-center gap-0.5">
          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-[10px] text-green-600 mr-1">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-[10px] text-red-500 mr-1">Save failed</span>
          )}
          <button
            type="button"
            className={actionBtn}
            onClick={handleSaveDraft}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Word count */}
      <div className="flex justify-end">
        <span className={`text-[11px] tabular-nums ${wordWarning ? 'text-amber-500' : 'text-zinc-400'}`}>
          {wordCount} words {wordWarning ? `(target: ${WORD_TARGET_MIN}–${WORD_TARGET_MAX})` : ''}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={variation.body}
        onChange={e => onChange({ ...variation, body: e.target.value, wordCount: countWords(e.target.value) })}
        placeholder="Your note text…"
        className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none leading-relaxed"
        style={{ minHeight: '100px', maxHeight: '280px', overflowY: 'auto' }}
      />

      {/* Distribution row */}
      <div className="pt-2 border-t border-zinc-100 space-y-2">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Publish to</p>
        <div className="flex flex-wrap gap-2">
          {/* Substack: always shown — copy + open link */}
          <div className="flex items-center gap-1.5">
            {copyState === 'copied' ? (
              <span className="flex items-center gap-1 text-[11px] text-green-600">
                <Check className="h-3 w-3" />
                Copied
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCopySubstack}
                className="flex items-center gap-1 text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                <Copy className="h-3 w-3" />
                Substack
              </button>
            )}
            <a
              href="https://substack.com/notes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Connected platform channels */}
          {crosspostChannels.map(ch => {
            const chState = crosspostState[ch.id] ?? 'idle'
            const label   = PLATFORM_LABELS[ch.platform] ?? ch.platform
            return (
              <div key={ch.id}>
                {chState === 'done' ? (
                  <span className="flex items-center gap-1 text-[11px] text-green-600">
                    <Check className="h-3 w-3" />
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCrosspost(ch.id, ch.platform)}
                    disabled={!savedOutputId || chState === 'posting'}
                    className="flex items-center gap-1 text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {chState === 'posting' ? `${label}…` : label}
                    {chState === 'error' && <span className="text-red-400 ml-1">✕</span>}
                  </button>
                )}
              </div>
            )
          })}

          {crosspostChannels.length === 0 && (
            <Link
              href="/settings/publishing"
              className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Connect channels to publish →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
