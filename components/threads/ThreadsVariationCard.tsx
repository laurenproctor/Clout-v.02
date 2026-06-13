'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Check } from 'lucide-react'
import { validateThreadsPost } from '@/lib/syndication/validation/threads'
import type { ThreadsVariation } from '@/lib/threads/types'
import { snapToNearestSlot } from '@/lib/calendar/slots'
import {
  SocialPreviewInline,
  previewFromStudioState,
  type ChannelLike,
} from '@/components/social-preview'

const MAX_LENGTH = 500
const WARN_LENGTH = 400

interface Props {
  variation: ThreadsVariation
  onChange: (updated: ThreadsVariation) => void
  initialOutputId?: string | null
  threadsChannelId?: string | null
  channel?: ChannelLike | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'queued' | 'scheduled'
type PublishState = 'idle' | 'publishing' | 'published' | 'error'

const actionBtn = "text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded hover:bg-zinc-100"

export function ThreadsVariationCard({ variation, onChange, initialOutputId, threadsChannelId, channel }: Props) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedOutputId, setSavedOutputId] = useState<string | null>(initialOutputId ?? null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    el.style.height = `${Math.max(80, el.scrollHeight)}px`
  }, [variation.primaryText])

  const renderedText = [
    variation.primaryText.trim(),
    variation.hashtag ? `#${variation.hashtag}` : ''
  ].filter(Boolean).join('\n').trim()

  const charCount = renderedText.length
  const validation = validateThreadsPost(renderedText)
  const isActioned = saveState === 'queued' || saveState === 'scheduled'

  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: 'threads',
        channel,
        body: variation.primaryText,
        hashtags: variation.hashtag ? [variation.hashtag] : [],
      }),
    [channel, variation.primaryText, variation.hashtag],
  )

  async function handleSaveDraft() {
    setSaveState('saving')
    try {
      if (savedOutputId) {
        await fetch(`/api/outputs/${savedOutputId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: variation.campaignName,
            content: {
              body: variation.primaryText,
              hashtags: variation.hashtag ? [variation.hashtag] : [],
              angle: variation.angle,
              openingLine: variation.openingLine,
              campaignName: variation.campaignName,
            },
            ...(threadsChannelId && { channel_id: threadsChannelId }),
          }),
        })
        setSaveState('saved')
      } else {
        const res = await fetch('/api/threads/outputs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variation: {
              primaryText: variation.primaryText,
              hashtag: variation.hashtag ?? null,
              angle: variation.angle,
              openingLine: variation.openingLine,
              campaignName: variation.campaignName,
            },
            title: variation.campaignName,
            channelId: threadsChannelId ?? null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as { id: string }
        setSavedOutputId(data.id)
        setSaveState('saved')
      }
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  async function handleQueue() {
    if (!savedOutputId) return
    try {
      await fetch(`/api/outputs/${savedOutputId}/queue`, { method: 'POST' })
      setSaveState('queued')
    } catch {
      // non-fatal
    }
  }

  async function handleConfirmSchedule() {
    if (!savedOutputId || !scheduleDate) return
    try {
      await fetch(`/api/outputs/${savedOutputId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: snapToNearestSlot(new Date(scheduleDate)).toISOString(),
          status: 'queued',
        }),
      })
      setScheduling(false)
      setScheduleDate('')
      setSaveState('scheduled')
    } catch {
      // non-fatal
    }
  }

  async function handlePublish() {
    if (!savedOutputId || !validation.publishable) return
    setPublishState('publishing')
    try {
      const res = await fetch('/api/channels/threads/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId: savedOutputId }),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json() as { postId?: string }
      setPublishedPostId(data.postId ?? null)
      setPublishState('published')
    } catch {
      setPublishState('error')
      setTimeout(() => setPublishState('idle'), 4000)
    }
  }

  return (
    <div className="border border-zinc-200 rounded-xl p-5 space-y-4 bg-white">
      {/* Live preview */}
      <SocialPreviewInline data={previewData} outputId={savedOutputId ?? null} label="Preview" />

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 border border-zinc-100 rounded-full px-2.5 py-0.5">
              {variation.label}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {saveState === 'saved' && savedOutputId && (
              <span className="flex items-center gap-1 text-[10px] text-green-600 mr-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {saveState === 'queued' && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 mr-1">
                <Check className="h-3 w-3" />
                Queued
              </span>
            )}
            {saveState === 'scheduled' && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 mr-1">
                <Check className="h-3 w-3" />
                Scheduled
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-[10px] text-red-500 mr-1">Save failed</span>
            )}
            <button type="button" className={actionBtn} onClick={handleSaveDraft} disabled={saveState === 'saving' || isActioned}>
              {saveState === 'saving' ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              className={`${actionBtn} ${!savedOutputId || isActioned ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleQueue}
              disabled={!savedOutputId || isActioned}
            >
              Queue
            </button>
            <button
              type="button"
              className={`${actionBtn} ${!savedOutputId || isActioned ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => { if (savedOutputId && !isActioned) setScheduling(v => !v) }}
              disabled={!savedOutputId || isActioned}
            >
              Schedule
            </button>
          </div>
        </div>
        {variation.campaignName && (
          <p className="text-xs text-zinc-400 truncate" title={variation.campaignName}>
            {variation.campaignName}
          </p>
        )}
        {scheduling && (
          <div className="flex items-center gap-2 pt-1 justify-end">
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <button
              type="button"
              onClick={handleConfirmSchedule}
              disabled={!scheduleDate}
              className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => { setScheduling(false); setScheduleDate('') }}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Char counter + validation */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {validation.technicalErrors.map((e, i) => (
            <span key={i} className="text-[11px] text-red-500 flex items-center gap-1">⚠ {e}</span>
          ))}
          {validation.platformRisks.map((r, i) => (
            <span key={i} className="text-[11px] text-orange-500">· {r}</span>
          ))}
          {validation.qualityWarnings.map((w, i) => (
            <span key={i} className="text-[11px] text-amber-600">· {w}</span>
          ))}
        </div>
        <span className={`text-[11px] tabular-nums shrink-0 ${charCount > MAX_LENGTH ? 'text-red-500' : charCount > WARN_LENGTH ? 'text-amber-500' : 'text-zinc-400'}`}>
          {charCount} / {MAX_LENGTH}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={variation.primaryText}
        onChange={e => onChange({ ...variation, primaryText: e.target.value })}
        placeholder="Write your Threads post..."
        className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none leading-relaxed"
        style={{ minHeight: '80px', maxHeight: '200px', overflowY: 'auto' }}
      />

      {/* Hashtag */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 shrink-0">#</span>
        <input
          type="text"
          value={variation.hashtag ?? ''}
          onChange={e => {
            const val = e.target.value.replace(/^#+/, '')
            onChange({ ...variation, hashtag: val || null })
          }}
          placeholder="optional hashtag"
          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Publish */}
      <div className="pt-2 border-t border-zinc-100">
        {publishState === 'published' && publishedPostId && (
          <div className="flex items-center gap-1.5 text-[11px] text-green-600">
            <Check className="h-3.5 w-3.5" />
            Published to Threads
          </div>
        )}
        {publishState === 'error' && (
          <p className="text-[11px] text-red-500">Publish failed. Please try again.</p>
        )}
        {publishState !== 'published' && (
          <div className="flex items-center gap-3">
            {threadsChannelId ? (
              <button
                type="button"
                onClick={handlePublish}
                disabled={!savedOutputId || !validation.publishable || publishState === 'publishing'}
                className="text-xs font-medium text-zinc-700 border border-zinc-200 rounded-md px-3 py-1.5 hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishState === 'publishing' ? 'Publishing...' : 'Publish to Threads'}
              </button>
            ) : (
              <a
                href="/settings/publishing"
                className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Connect Threads to publish →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
