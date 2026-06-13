'use client'

import * as React from 'react'
import type { PreviewCarousel, PreviewMedia, PreviewPlatform } from '../core/types'
import { parseAspectRatio } from '../core/spec'

/**
 * Fetch a post's generated visual assets and normalize them into preview media.
 *
 * Design notes:
 *  - Skips fetching entirely when `outputId` is missing (returns a safe empty
 *    state). No request ever fires with an invalid id.
 *  - Fetches newest-first from `/api/visual/assets?outputId=` (mirrors the
 *    AbortController cleanup used in components/studio/visuals-tab.tsx).
 *  - `SocialPreview` itself must NOT fetch — this hook lives at the call site
 *    (Studio). List surfaces (Calendar/Review) should pass prehydrated media to
 *    avoid N+1.
 *
 * Carousels: multiple stored assets become an image carousel. Instagram
 * text-slides (which live outside visual_assets) can be merged in by the caller
 * via the optional `slides` argument.
 */

interface StoredAsset {
  id: string
  original_url: string
  aspect_ratio: string | null
  mode?: string | null
}

export interface PreviewAssetsResult {
  media: PreviewMedia[]
  carousel?: PreviewCarousel
  loading: boolean
  error?: string
}

const EMPTY: PreviewAssetsResult = { media: [], loading: false }

/** Internal: results tagged with the id they were fetched for, to drop stale data. */
interface ResolvedState extends PreviewAssetsResult {
  forId?: string
}

export function usePreviewAssets(
  outputId: string | null | undefined,
  platform: PreviewPlatform,
): PreviewAssetsResult {
  const [resolved, setResolved] = React.useState<ResolvedState>({ media: [], loading: false })

  React.useEffect(() => {
    // No id → nothing to fetch; the derived value below returns EMPTY.
    if (!outputId) return

    const controller = new AbortController()

    fetch(`/api/visual/assets?outputId=${encodeURIComponent(outputId)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((assets: StoredAsset[]) => {
        if (controller.signal.aborted) return

        const valid = (assets ?? []).filter((a) => a && a.original_url)
        const media: PreviewMedia[] = valid.map((a) => ({
          url: a.original_url,
          aspectRatio: parseAspectRatio(a.aspect_ratio, platform),
        }))

        // Multiple assets on a carousel-capable platform → image carousel.
        const carousel: PreviewCarousel | undefined =
          media.length > 1 ? { kind: 'image', images: media } : undefined

        setResolved({
          media: carousel ? media : media.slice(0, 1),
          carousel,
          loading: false,
          forId: outputId,
        })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setResolved({ media: [], loading: false, error: 'Failed to load media', forId: outputId })
      })

    return () => controller.abort()
  }, [outputId, platform])

  // Derive the public result: EMPTY without an id, loading until results for the
  // *current* id arrive (stale results for a previous id are ignored).
  return React.useMemo<PreviewAssetsResult>(() => {
    if (!outputId) return EMPTY
    if (resolved.forId !== outputId) return { media: [], loading: true }
    return { media: resolved.media, carousel: resolved.carousel, loading: false, error: resolved.error }
  }, [outputId, resolved])
}
