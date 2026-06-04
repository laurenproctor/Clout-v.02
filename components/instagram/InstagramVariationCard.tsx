'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InstagramVariation } from '@/lib/instagram/types'
import { HashtagChips } from '@/components/linkedin/HashtagChips'
import { CarouselPreview } from './CarouselPreview'

interface InstagramVariationCardProps {
  variation: InstagramVariation
  onChange: (updated: InstagramVariation) => void
  initialOutputId: string | null
  instagramChannelId: string | null
}

const FORMAT_LABELS: Record<string, string> = {
  educational_carousel: 'Educational Carousel',
  quote_graphic:        'Quote Graphic',
  framework:            'Framework',
  narrative_story:      'Narrative Story',
  data_insight:         'Data Insight',
}

const MAX_CAPTION = 2200

export function InstagramVariationCard({
  variation,
  onChange,
  initialOutputId,
  instagramChannelId,
}: InstagramVariationCardProps) {
  const [outputId, setOutputId] = useState<string | null>(initialOutputId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showIntelligence, setShowIntelligence] = useState(false)

  const captionLength = variation.caption.length
  const captionOver = captionLength > MAX_CAPTION

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const endpoint = outputId ? `/api/outputs/${outputId}` : '/api/instagram/outputs'
      const method = outputId ? 'PATCH' : 'POST'

      const body = outputId
        ? { content: { body: variation.caption, hashtags: variation.hashtags, slides: variation.slides, visualPlan: variation.visualPlan, intelligence: variation.intelligence, campaignName: variation.campaignName, resolvedFormat: variation.resolvedFormat, resolvedStyle: variation.resolvedStyle } }
        : { variation: { caption: variation.caption, hashtags: variation.hashtags, slides: variation.slides, visualPlan: variation.visualPlan, intelligence: variation.intelligence, campaignName: variation.campaignName, resolvedFormat: variation.resolvedFormat, resolvedStyle: variation.resolvedStyle }, title: variation.campaignName, channelId: instagramChannelId ?? null }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      if (!outputId) {
        const data = await res.json() as { id: string }
        setOutputId(data.id)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [outputId, saving, variation, instagramChannelId])

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 border border-zinc-200 rounded-full px-2 py-0.5">
              {variation.label}
            </span>
            <span className="text-[10px] text-zinc-400 border border-zinc-200 rounded-full px-2 py-0.5">
              {FORMAT_LABELS[variation.resolvedFormat] ?? variation.resolvedFormat}
            </span>
            <span className="text-[10px] text-zinc-400 border border-zinc-200 rounded-full px-2 py-0.5 capitalize">
              {variation.resolvedStyle}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-900 leading-snug">
            {variation.campaignName}
          </p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Carousel Preview */}
        <CarouselPreview
          slides={variation.slides}
          resolvedStyle={variation.resolvedStyle}
          resolvedFormat={variation.resolvedFormat}
        />

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-500">Caption</p>
            <span className={cn('text-[11px]', captionOver ? 'text-red-500' : 'text-zinc-300')}>
              {captionLength}/{MAX_CAPTION}
            </span>
          </div>
          <textarea
            value={variation.caption}
            onChange={(e) => onChange({ ...variation, caption: e.target.value })}
            rows={6}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none resize-y leading-relaxed"
          />
        </div>

        {/* Hashtags */}
        <HashtagChips
          hashtags={variation.hashtags}
          onChange={(hashtags) => onChange({ ...variation, hashtags })}
        />

        {/* Intelligence */}
        <div className="border border-zinc-100 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowIntelligence((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 transition-colors"
          >
            <span>Why this approach</span>
            {showIntelligence ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showIntelligence && (
            <div className="px-4 py-3 space-y-3 border-t border-zinc-100">
              {variation.intelligence.formatRationale && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Format</p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{variation.intelligence.formatRationale}</p>
                </div>
              )}
              {variation.intelligence.captionStrategy && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Caption</p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{variation.intelligence.captionStrategy}</p>
                </div>
              )}
              {variation.intelligence.visualNarrative && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Visual</p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{variation.intelligence.visualNarrative}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <p className="text-xs text-red-600">{saveError}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between gap-3">
        {outputId ? (
          <Link
            href={`/studio/${outputId}`}
            className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors underline underline-offset-2"
          >
            Open in Studio
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-zinc-900 text-white rounded-md px-4 py-1.5 text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : outputId ? 'Update Draft' : 'Save Draft'}
        </button>
      </div>
    </div>
  )
}
