'use client'

import { useCallback, useState } from 'react'
import type { AdaptedDraft, AdaptTargetPlatform } from '@/lib/create/types'

// The current anchor the adaptations derive from. Platform-agnostic on purpose —
// any platform's Create workspace passes its approved anchor's id/body/hashtags.
export interface AdaptAnchor {
  id: string
  body: string
  hashtags: string[]
}

export interface UseAdaptationsResult {
  adaptations: AdaptedDraft[]
  adaptingPlatform: AdaptTargetPlatform | null
  error: string | null
  /** Derive one native draft for `platform` from the given anchor. No-op while another adapt is in flight. */
  adapt: (platform: AdaptTargetPlatform, anchor: AdaptAnchor) => Promise<void>
  updateAdaptation: (index: number, updated: AdaptedDraft) => void
  reset: () => void
}

/**
 * Reusable orchestration for "Adapt to other platforms": calls POST
 * /api/create/adapt (which resolves brand/campaign context server-side) and
 * accumulates the resulting AdaptedDrafts. Failures are isolated here as an
 * error string — callers surface it section-level and must not touch the anchor.
 *
 * Extracted from the LinkedIn slice so other platforms reuse it unchanged.
 * Intentionally does NOT emit product events — the event name is source-platform
 * specific (e.g. linkedin_adaptation_requested), so the caller logs it.
 */
export function useAdaptations(campaignId?: string | null): UseAdaptationsResult {
  const [adaptations, setAdaptations] = useState<AdaptedDraft[]>([])
  const [adaptingPlatform, setAdaptingPlatform] = useState<AdaptTargetPlatform | null>(null)
  const [error, setError] = useState<string | null>(null)

  const adapt = useCallback(async (platform: AdaptTargetPlatform, anchor: AdaptAnchor) => {
    if (adaptingPlatform) return
    setError(null)
    setAdaptingPlatform(platform)
    try {
      const res = await fetch('/api/create/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anchorBody: anchor.body,
          anchorHashtags: anchor.hashtags,
          targetPlatform: platform,
          ...(campaignId ? { campaignId } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Adaptation failed.')
      }
      const data = await res.json() as { body: string; hashtags: string[]; campaignName: string }
      setAdaptations(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          platform,
          sourceAnchorId: anchor.id,
          body: data.body,
          hashtags: data.hashtags ?? [],
          campaignName: data.campaignName,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adaptation failed.')
    } finally {
      setAdaptingPlatform(null)
    }
  }, [adaptingPlatform, campaignId])

  const updateAdaptation = useCallback((index: number, updated: AdaptedDraft) => {
    setAdaptations(prev => prev.map((d, i) => (i === index ? updated : d)))
  }, [])

  const reset = useCallback(() => {
    setAdaptations([])
    setError(null)
    setAdaptingPlatform(null)
  }, [])

  return { adaptations, adaptingPlatform, error, adapt, updateAdaptation, reset }
}
