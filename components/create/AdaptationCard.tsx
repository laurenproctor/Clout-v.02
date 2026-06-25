'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Copy as CopyIcon } from 'lucide-react'
import type { AdaptedDraft } from '@/lib/create/types'
import { serializeForCopy } from '@/lib/create/serializeForCopy'
import { SocialPreviewInline, previewFromStudioState } from '@/components/social-preview'

interface AdaptationCardProps {
  draft: AdaptedDraft
  onChange: (updated: AdaptedDraft) => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'scheduled'

const actionBtn =
  'text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded hover:bg-zinc-100'

const PLATFORM_LABEL: Record<AdaptedDraft['platform'], string> = {
  threads: 'Threads version',
  x: 'X version',
}

// Per-platform save endpoint + payload shape (mirrors each platform's outputs route).
function buildSavePayload(draft: AdaptedDraft) {
  if (draft.platform === 'threads') {
    return {
      url: '/api/threads/outputs',
      body: {
        variation: {
          primaryText: draft.body,
          hashtag: draft.hashtags[0] ?? null,
          campaignName: draft.campaignName,
        },
        title: draft.campaignName,
      },
    }
  }
  return {
    url: '/api/x/outputs',
    body: {
      variation: {
        body: draft.body,
        hashtags: draft.hashtags,
        campaignName: draft.campaignName,
      },
      title: draft.campaignName,
    },
  }
}

// A derived channel version of the approved anchor — intentionally lighter and
// visually subordinate to the LinkedIn anchor. Not auto-saved: the user persists
// it explicitly via Save/Schedule.
export function AdaptationCard({ draft, onChange }: AdaptationCardProps) {
  const params = useParams<{ workspaceSlug?: string }>()
  const workspaceSlug = params?.workspaceSlug
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedOutputId, setSavedOutputId] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')

  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: draft.platform,
        channel: null,
        body: draft.body ?? '',
        hashtags: draft.hashtags ?? [],
      }),
    [draft.platform, draft.body, draft.hashtags],
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(serializeForCopy(draft.body, draft.hashtags))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — non-fatal */
    }
  }

  async function handleSave() {
    setSaveState('saving')
    try {
      if (savedOutputId) {
        await fetch(`/api/outputs/${savedOutputId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.campaignName,
            content: { body: draft.body, hashtags: draft.hashtags },
          }),
        })
        setSaveState('saved')
        return
      }
      const { url, body } = buildSavePayload(draft)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { id: string }
      setSavedOutputId(data.id)
      setSaveState('saved')
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
          scheduled_at: new Date(scheduleDate).toISOString(),
          status: 'queued',
        }),
      })
      setScheduling(false)
      setScheduleDate('')
      setSaveState('scheduled')
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="border border-zinc-200 rounded-lg p-4 space-y-4 bg-zinc-50/60">
      {/* Header — labels it as a derived channel version, not a competing draft */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-700">{PLATFORM_LABEL[draft.platform]}</span>
          <span className="text-[10px] text-zinc-400">Adapted from LinkedIn anchor</span>
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
          <button type="button" className={`${actionBtn} flex items-center gap-1`} onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Preview — the platform-native post renders inside its own preview card */}
      <SocialPreviewInline data={previewData} outputId={savedOutputId ?? null} mode="full" fit />

      {/* Actions */}
      <div className="space-y-1">
        <div className="flex justify-end gap-0.5 items-center">
          {saveState === 'saved' && savedOutputId && (
            <span className="flex items-center gap-1 text-[10px] text-green-600 mr-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {saveState === 'scheduled' && (
            <span className="flex items-center gap-1 text-[10px] text-blue-600 mr-1">
              <Check className="h-3 w-3" /> Scheduled
            </span>
          )}
          {saveState === 'error' && <span className="text-[10px] text-red-500 mr-1">Save failed</span>}
          {savedOutputId && workspaceSlug && (
            <a href={`/${workspaceSlug}/studio/${savedOutputId}`} className={actionBtn}>
              View in Studio
            </a>
          )}
          <button
            type="button"
            className={actionBtn}
            onClick={handleSave}
            disabled={saveState === 'saving' || saveState === 'scheduled'}
          >
            {saveState === 'saving' ? 'Saving…' : savedOutputId ? 'Update' : 'Save'}
          </button>
          <button
            type="button"
            className={`${actionBtn} ${!savedOutputId || saveState === 'scheduled' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => { if (savedOutputId && saveState !== 'scheduled') setScheduling(v => !v) }}
            disabled={!savedOutputId || saveState === 'scheduled'}
          >
            Schedule
          </button>
        </div>

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

      {/* Edit — body textarea only while editing; preview above stays live */}
      {editing && (
        <div className="border-t border-zinc-200 pt-3">
          <textarea
            value={draft.body}
            onChange={e => onChange({ ...draft, body: e.target.value })}
            rows={5}
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          {draft.platform === 'x' && (
            <p className={`mt-1 text-[10px] ${draft.body.length > 280 ? 'text-red-500' : 'text-zinc-400'}`}>
              {draft.body.length}/280
            </p>
          )}
        </div>
      )}
    </div>
  )
}
