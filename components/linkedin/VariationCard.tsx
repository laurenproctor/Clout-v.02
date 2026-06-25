'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ImageIcon, Check, Copy as CopyIcon } from 'lucide-react'
import type { LinkedInVariation } from '@/lib/linkedin/types'
import { PostEditor } from './PostEditor'
import { HookSuggestions } from './HookSuggestions'
import { HashtagChips } from './HashtagChips'
import { MentionTags } from './MentionTags'
import { CTASuggestions } from './CTASuggestions'
import { VisualGenerator } from '@/components/visual/VisualGenerator'
import {
  SocialPreviewInline,
  previewFromStudioState,
  type ChannelLike,
} from '@/components/social-preview'
import { serializeForCopy } from '@/lib/create/serializeForCopy'

interface VariationCardProps {
  variation: LinkedInVariation
  onChange: (updated: LinkedInVariation) => void
  initialOutputId?: string | null
  linkedInChannelId?: string | null
  channel?: ChannelLike | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'queued' | 'scheduled'

const actionBtn = "text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded hover:bg-zinc-100"

export function VariationCard({ variation, onChange, initialOutputId, linkedInChannelId, channel }: VariationCardProps) {
  const params = useParams<{ workspaceSlug?: string }>()
  const workspaceSlug = params?.workspaceSlug
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedOutputId, setSavedOutputId] = useState<string | null>(initialOutputId ?? null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [copied, setCopied] = useState(false)
  // Preview-first card: the full LinkedIn preview is the canonical read view.
  // The editor controls (body textarea, transforms, visual, hashtags, …) only
  // appear when editing. State lives in `variation` (lifted via onChange), so
  // it survives toggling this panel.
  const [editing, setEditing] = useState(false)

  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: 'linkedin',
        channel,
        body: variation.body ?? '',
        hashtags: variation.hashtags ?? [],
      }),
    [channel, variation.body, variation.hashtags],
  )

  // Sync when async auto-save completes and parent passes back the ID
  useEffect(() => {
    if (initialOutputId && !savedOutputId) {
      setSavedOutputId(initialOutputId)
      if (saveState === 'idle') setSaveState('saved')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOutputId])

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
              body: variation.body,
              hashtags: variation.hashtags,
              primaryVisualAssetId: variation.selectedVisualAssetId ?? null,
            },
            ...(linkedInChannelId && { channel_id: linkedInChannelId }),
          }),
        })
        setSaveState('saved')
      } else {
        const res = await fetch('/api/linkedin/outputs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variation: {
              body: variation.body,
              hashtags: variation.hashtags,
              primaryVisualAssetId: variation.selectedVisualAssetId ?? null,
            },
            title: variation.campaignName,
            channelId: linkedInChannelId ?? null,
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

  async function handleConfirmSchedule() {
    if (!savedOutputId || !scheduleDate) return
    try {
      await fetch(`/api/outputs/${savedOutputId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Server snaps scheduled_at forward to the next workspace-tz slot.
          scheduled_at: new Date(scheduleDate).toISOString(),
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(serializeForCopy(variation.body, variation.hashtags))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — non-fatal
    }
  }

  async function handleAttach(assetId: string) {
    onChange({ ...variation, selectedVisualAssetId: assetId })
    // If already saved, immediately persist the visual attachment
    if (savedOutputId) {
      try {
        await fetch(`/api/outputs/${savedOutputId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: {
              body: variation.body,
              hashtags: variation.hashtags,
              primaryVisualAssetId: assetId,
            },
          }),
        })
      } catch {
        // non-fatal — asset is attached locally, will persist on next manual save
      }
    }
  }

  const isActioned = saveState === 'queued' || saveState === 'scheduled'

  return (
    <div className="border border-zinc-200 rounded-xl p-5 space-y-5 bg-white">
      {/* A. Header / metadata — title, subtitle, visual chip, top actions */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">{variation.label}</span>
            {variation.selectedVisualAssetId && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                <ImageIcon className="h-3 w-3" />
                Visual attached
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={`${actionBtn} ${editing ? 'text-zinc-800 bg-zinc-100' : ''}`}
              aria-pressed={editing}
              onClick={() => setEditing(v => !v)}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
            <button
              type="button"
              className={`${actionBtn} flex items-center gap-1`}
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <CopyIcon className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        {variation.campaignName && (
          <p className="text-xs text-zinc-400 truncate" title={variation.campaignName}>
            {variation.campaignName}
          </p>
        )}
      </div>

      {/* B. Adaptations applied (above the preview) */}
      {variation.transformationDelta.changes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">Adaptations applied</p>
          <div className="flex flex-wrap gap-1.5">
            {variation.transformationDelta.changes.map((change, i) => (
              <span
                key={i}
                className="bg-zinc-50 border border-zinc-100 text-zinc-500 text-xs rounded-full px-2.5 py-1"
              >
                {change}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* C. Canonical full LinkedIn preview — contains the complete post */}
      <SocialPreviewInline
        data={previewData}
        outputId={savedOutputId ?? null}
        mode="full"
        fit
      />

      {/* D. Action controls — the anchor is auto-saved, so we surface a clear
          saved state rather than a redundant primary "Save". Update PATCHes the
          existing draft (never creates a second one); Schedule reuses it too. */}
      <div className="space-y-1">
        <div className="flex justify-end gap-0.5 items-center">
          {savedOutputId && saveState !== 'scheduled' && saveState !== 'queued' && (
            <span className="flex items-center gap-1 text-[10px] text-green-600 mr-1">
              <Check className="h-3 w-3" />
              {saveState === 'saving' ? 'Saving…' : 'Saved'}
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
          {savedOutputId && workspaceSlug && (
            <a
              href={`/${workspaceSlug}/studio/${savedOutputId}`}
              className={actionBtn}
            >
              View in Studio
            </a>
          )}
          <button
            type="button"
            className={actionBtn}
            onClick={handleSaveDraft}
            disabled={saveState === 'saving' || isActioned}
          >
            {saveState === 'saving' ? 'Saving…' : savedOutputId ? 'Update' : 'Save'}
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

        {/* Inline schedule picker */}
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

      {/* E. Edit panel — only while editing; preview above stays visible & live */}
      {editing && (
        <div className="space-y-5 border-t border-zinc-100 pt-5">
          <PostEditor
            body={variation.body}
            onChange={(body) => onChange({ ...variation, body })}
          />

          <VisualGenerator
            content={variation.body}
            platform="linkedin"
            aspectRatio="landscape"
            onAttach={handleAttach}
          />

          <HookSuggestions hooks={variation.hooks} />

          <HashtagChips
            hashtags={variation.hashtags}
            onChange={(hashtags) => onChange({ ...variation, hashtags })}
          />

          <MentionTags
            mentions={variation.mentions}
            onChange={(mentions) => onChange({ ...variation, mentions })}
          />

          <CTASuggestions
            suggestions={variation.ctaSuggestions}
            onSelect={(text) => onChange({ ...variation, body: variation.body + '\n\n' + text })}
          />
        </div>
      )}
    </div>
  )
}
