'use client'

import * as React from 'react'
import type { PreviewData } from './core/types'
import { SocialPreview } from './SocialPreview'
import { SocialPreviewModal } from './SocialPreviewModal'
import { usePreviewAssets } from './hooks/usePreviewAssets'

/**
 * Drop-in inline preview for `/create` result cards and result views.
 *
 * Renders a compact, network-specific preview from the card's CURRENT editable
 * state, owns its own expand-to-full-size modal, and (optionally) enriches with
 * generated visual assets for the given output.
 *
 * Design rules (see plan):
 *  - Local `data` always wins over fetched assets — critical for Instagram,
 *    where live `variation.slides` must not be replaced by stale saved assets.
 *  - Asset enrichment is purely optional and non-blocking: if `usePreviewAssets`
 *    errors, returns nothing, or `outputId` is null, the preview still renders
 *    from local state. A preview failure must never affect Save/Queue/Schedule/
 *    Publish — this component owns no mutation.
 */

interface SocialPreviewInlineProps {
  data: PreviewData
  outputId?: string | null
  label?: string
  className?: string
}

export function SocialPreviewInline({
  data,
  outputId,
  label,
  className,
}: SocialPreviewInlineProps) {
  const [open, setOpen] = React.useState(false)

  // Optional, non-blocking enrichment. No-ops when outputId is null.
  const fetched = usePreviewAssets(outputId ?? null, data.platform)

  // Local data always takes precedence over fetched assets.
  const mergedPreviewData = React.useMemo<PreviewData>(
    () => ({
      ...data,
      media: data.media ?? fetched.media,
      carousel: data.carousel ?? fetched.carousel,
    }),
    [data, fetched.media, fetched.carousel],
  )

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
          className="text-zinc-400"
        >
          {label}
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <SocialPreview
          data={mergedPreviewData}
          mode="compact"
          theme="light"
          onExpand={() => setOpen(true)}
        />
      </div>

      <SocialPreviewModal data={mergedPreviewData} open={open} onOpenChange={setOpen} />
    </div>
  )
}
