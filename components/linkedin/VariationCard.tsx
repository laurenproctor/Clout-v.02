'use client'

import { useState } from 'react'
import { ImageIcon, Check } from 'lucide-react'
import type { LinkedInVariation } from '@/lib/linkedin/types'
import { PostEditor } from './PostEditor'
import { HookSuggestions } from './HookSuggestions'
import { HashtagChips } from './HashtagChips'
import { MentionTags } from './MentionTags'
import { CTASuggestions } from './CTASuggestions'
import { VisualGenerator } from '@/components/visual/VisualGenerator'

interface VariationCardProps {
  variation: LinkedInVariation
  onChange: (updated: LinkedInVariation) => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const actionBtn = "text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded hover:bg-zinc-100"

export function VariationCard({ variation, onChange }: VariationCardProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedOutputId, setSavedOutputId] = useState<string | null>(null)

  async function handleSaveDraft() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/linkedin/outputs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variation }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { id: string }
      setSavedOutputId(data.id)
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <div className="border border-zinc-200 rounded-xl p-5 space-y-5 bg-white">
      {/* A. Header row */}
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
            <button type="button" className={actionBtn}>Edit</button>
            <button type="button" className={actionBtn}>Duplicate</button>
            <button type="button" className={actionBtn}>Rewrite</button>
          </div>
        </div>
        <div className="flex justify-end gap-0.5 items-center">
          {saveState === 'saved' && savedOutputId && (
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
          <button type="button" disabled className={`${actionBtn} cursor-not-allowed opacity-50`}>Queue</button>
          <button type="button" disabled className={`${actionBtn} cursor-not-allowed opacity-50`}>Schedule</button>
        </div>
      </div>

      {/* B. TransformationDelta strip */}
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

      {/* C. PostEditor */}
      <PostEditor
        body={variation.body}
        onChange={(body) => onChange({ ...variation, body })}
      />

      {/* D. Visual */}
      <VisualGenerator
        content={variation.body}
        platform="linkedin"
        aspectRatio="landscape"
        onAttach={(assetId) => onChange({ ...variation, selectedVisualAssetId: assetId })}
      />

      {/* E. HookSuggestions */}
      <HookSuggestions hooks={variation.hooks} />

      {/* F. HashtagChips */}
      <HashtagChips
        hashtags={variation.hashtags}
        onChange={(hashtags) => onChange({ ...variation, hashtags })}
      />

      {/* G. MentionTags */}
      <MentionTags
        mentions={variation.mentions}
        onChange={(mentions) => onChange({ ...variation, mentions })}
      />

      {/* H. CTASuggestions */}
      <CTASuggestions
        suggestions={variation.ctaSuggestions}
        onSelect={(text) => onChange({ ...variation, body: variation.body + '\n\n' + text })}
      />
    </div>
  )
}
