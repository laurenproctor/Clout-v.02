'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InstagramVariation } from '@/lib/instagram/types'
import { HashtagChips } from '@/components/linkedin/HashtagChips'
import { CarouselPreview } from './CarouselPreview'
import {
  SocialPreviewInline,
  previewFromStudioState,
  type ChannelLike,
} from '@/components/social-preview'

interface InstagramVariationCardProps {
  variation: InstagramVariation
  onChange: (updated: InstagramVariation) => void
  initialOutputId: string | null
  instagramChannelId: string | null
  channel?: ChannelLike | null
  logoUrl: string | null
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
  channel,
  logoUrl,
}: InstagramVariationCardProps) {
  const [outputId, setOutputId] = useState<string | null>(initialOutputId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showIntelligence, setShowIntelligence] = useState(false)
  const [includeLogo, setIncludeLogo] = useState(!!logoUrl)
  const [logoAssetId, setLogoAssetId] = useState<string | null>(
    logoUrl && variation.visualAssetIds?.[0] ? variation.visualAssetIds[0] : null
  )
  const [nonLogoAssetId, setNonLogoAssetId] = useState<string | null>(
    !logoUrl && variation.visualAssetIds?.[0] ? variation.visualAssetIds[0] : null
  )
  const [renderingAsset, setRenderingAsset] = useState(false)

  const captionLength = variation.caption.length
  const captionOver = captionLength > MAX_CAPTION

  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: 'instagram',
        channel,
        body: variation.caption,
        hashtags: variation.hashtags,
        carousel: { kind: 'text-slides', slides: variation.slides ?? [] },
      }),
    [channel, variation.caption, variation.hashtags, variation.slides],
  )

  const handleLogoToggle = useCallback(async (next: boolean) => {
    setIncludeLogo(next)
    const cached = next ? logoAssetId : nonLogoAssetId
    if (cached) {
      onChange({ ...variation, visualAssetIds: [cached] })
      return
    }
    setRenderingAsset(true)
    try {
      const res = await fetch('/api/visual/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:            'content-derived',
          platform:        'instagram',
          aspectRatio:     variation.visualPlan.aspectRatio === '1:1' ? 'square' : 'portrait',
          keyIdea:         variation.caption.slice(0, 200),
          visualObjective: variation.intelligence.visualNarrative,
          includeLogo:     next,
        }),
      })
      const asset = await res.json() as { assetId?: string }
      if (asset.assetId) {
        if (next) setLogoAssetId(asset.assetId)
        else setNonLogoAssetId(asset.assetId)
        onChange({ ...variation, visualAssetIds: [asset.assetId] })
      }
    } catch {
      setIncludeLogo(!next)
    } finally {
      setRenderingAsset(false)
    }
  }, [logoAssetId, nonLogoAssetId, variation, onChange])

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
        {/* Live preview */}
        <SocialPreviewInline data={previewData} outputId={outputId ?? null} label="Preview" />

        {/* Carousel Preview */}
        <CarouselPreview
          slides={variation.slides}
          resolvedStyle={variation.resolvedStyle}
          resolvedFormat={variation.resolvedFormat}
        />

        {/* Logo toggle */}
        {logoUrl && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={includeLogo}
              onClick={() => handleLogoToggle(!includeLogo)}
              disabled={renderingAsset}
              className={cn(
                'relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors disabled:opacity-50',
                includeLogo ? 'bg-zinc-900 border-zinc-900' : 'bg-zinc-200 border-zinc-200'
              )}
            >
              <span className={cn(
                'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform mt-0.5',
                includeLogo ? 'translate-x-3.5' : 'translate-x-0.5'
              )} />
            </button>
            <span className="text-xs text-zinc-500">Include Logo</span>
            {renderingAsset && (
              <span className="text-[10px] text-zinc-400">Rendering...</span>
            )}
          </div>
        )}

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
