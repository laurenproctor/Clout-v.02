'use client'

import { useState } from 'react'
import { PublishingActions } from '@/components/publishing/PublishingActions'

const GBP_HARD_MAX  = 1500
const GBP_SOFT_WARN = 300

const REWRITE_VARIANTS = [
  { label: 'More specific',     note: 'Make this more specific — add concrete details: hours, prices, outcomes, or location names. Remove anything abstract.' },
  { label: 'Shorter',           note: 'Cut this significantly. Keep only the single most operationally useful sentence. Aim for under 150 characters.' },
  { label: 'Add a CTA',         note: 'Rewrite to end with a clear call to action appropriate for this business type (call, book, visit, ask about X).' },
  { label: 'More local',        note: 'Rewrite with stronger local relevance — neighborhood, city, community, or seasonal context.' },
  { label: 'Remove marketing',  note: 'Strip all marketing language and polish. Rewrite as if a real business owner wrote it in 30 seconds.' },
]

interface ChannelOption {
  id: string
  label: string | null
  google_location_name?: string | null
  city?: string | null
  state?: string | null
  google_verified?: boolean
}

interface Props {
  content: string
  locationOptions: ChannelOption[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
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

export default function GoogleBusinessProfileCard({
  content,
  locationOptions,
  selectedChannelId,
  onSelectChannel,
  onFocus,
  onCopy,
  onRegenerate,
  onSaveDraft,
  onPublishNow,
  onSchedule,
  onQueue,
  isSaving,
  isPublishing,
  savedAt,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [showVariants, setShowVariants] = useState(false)

  const charCount   = content.length
  const overHard    = charCount > GBP_HARD_MAX
  const overSoft    = charCount > GBP_SOFT_WARN

  const selectedLocation = locationOptions.find(l => l.id === selectedChannelId) ?? locationOptions[0]
  const locationLabel = selectedLocation
    ? [selectedLocation.label, selectedLocation.city, selectedLocation.state].filter(Boolean).join(', ')
    : null

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
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Local Update</span>
          <span className="text-[14px] text-zinc-400">Search presence · trust signals</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-zinc-400 border border-zinc-100 rounded-full px-2 py-0.5 tracking-wide">
            Search Preview
          </span>
          <span
            className={`text-[14px] tabular-nums ml-1 ${overHard ? 'text-red-500' : overSoft ? 'text-amber-500' : 'text-zinc-400'}`}
          >
            {charCount} / {GBP_HARD_MAX}
          </span>
        </div>
      </div>

      {/* Location selector */}
      {locationOptions.length > 0 && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <span className="text-xs text-zinc-400 shrink-0">Publishing to:</span>
          {locationOptions.length === 1 ? (
            <span className="text-xs text-zinc-600 font-medium">
              {locationLabel}
              {selectedLocation?.google_verified && (
                <span className="ml-1.5 text-[11px] text-emerald-600 font-medium">Verified</span>
              )}
            </span>
          ) : (
            <select
              value={selectedChannelId ?? locationOptions[0]?.id ?? ''}
              onChange={e => onSelectChannel(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {locationOptions.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {[loc.label, loc.city, loc.state].filter(Boolean).join(', ')}
                  {loc.google_verified ? ' ✓' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Char limit warning */}
      {overHard && (
        <div className="px-5 pb-3">
          <p className="text-[13px] text-red-500">⚠ Exceeds 1,500 character limit. Google will reject this post.</p>
        </div>
      )}

      {/* Post body */}
      <div className="px-5 pb-6 cursor-pointer" onClick={onFocus}>
        <p className="text-[17px] leading-[1.75] text-zinc-900 whitespace-pre-wrap">
          {content}
        </p>
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
