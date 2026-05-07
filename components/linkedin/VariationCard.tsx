'use client'

import type { LinkedInVariation } from '@/lib/linkedin/types'
import { PostEditor } from './PostEditor'
import { HookSuggestions } from './HookSuggestions'
import { HashtagChips } from './HashtagChips'
import { MentionTags } from './MentionTags'
import { CTASuggestions } from './CTASuggestions'

interface VariationCardProps {
  variation: LinkedInVariation
  onChange: (updated: LinkedInVariation) => void
}

const actionBtn = "text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded hover:bg-zinc-100"

export function VariationCard({ variation, onChange }: VariationCardProps) {
  return (
    <div className="border border-zinc-200 rounded-xl p-5 space-y-5 bg-white">
      {/* A. Header row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">{variation.label}</span>
          <div className="flex items-center gap-0.5">
            <button type="button" className={actionBtn}>Edit</button>
            <button type="button" className={actionBtn}>Duplicate</button>
            <button type="button" className={actionBtn}>Rewrite</button>
          </div>
        </div>
        <div className="flex justify-end gap-0.5">
          <button type="button" className={actionBtn}>Save Draft</button>
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

      {/* D. HookSuggestions */}
      <HookSuggestions hooks={variation.hooks} />

      {/* E. HashtagChips */}
      <HashtagChips
        hashtags={variation.hashtags}
        onChange={(hashtags) => onChange({ ...variation, hashtags })}
      />

      {/* F. MentionTags */}
      <MentionTags
        mentions={variation.mentions}
        onChange={(mentions) => onChange({ ...variation, mentions })}
      />

      {/* G. CTASuggestions */}
      <CTASuggestions
        suggestions={variation.ctaSuggestions}
        onSelect={(text) => onChange({ ...variation, body: variation.body + '\n\n' + text })}
      />
    </div>
  )
}
