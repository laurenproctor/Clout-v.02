// lib/visual/requestVisual.ts
// Single client-side entry point for POST /api/visual/generate. Owning the
// request/response shape here keeps manual generation (VisualGenerator) and the
// auto "LinkedIn Image Post" flow (VariationCard) from drifting apart.

import type { VisualPlatform, AspectRatio, VisualIntent } from '@/lib/visual/types/visual'

export interface RequestVisualBody {
  content?: string
  platform?: VisualPlatform
  outputId?: string
  aspectRatio?: AspectRatio
  promptOverride?: string
  parentAssetId?: string
  generationGroupId?: string
  /** Auto branded-card flow: derive overlay copy server-side. */
  deriveOverlay?: boolean
  /** Constrained flag → server derives `purpose` (idempotency). Never send `purpose` directly. */
  autoLinkedInImagePost?: boolean
  colorScheme?: 'light' | 'dark'
  includeLogo?: boolean
}

export interface GeneratedVisualResult {
  assetId: string
  url: string                    // preferred display URL (composedUrl if available)
  backgroundUrl?: string         // raw AI background
  composedUrl?: string | null    // final composed image (hybrid-overlay)
  templateId?: string | null     // which template was used
  readabilityRating?: string | null
  visualIntent: VisualIntent | null
  prompt: string
  aspectRatio: AspectRatio
  generationGroupId: string
  /** True when the server returned a pre-existing asset (idempotency fast-path). */
  idempotent?: boolean
}

export async function requestVisual(
  body: RequestVisualBody,
  options?: { signal?: AbortSignal },
): Promise<GeneratedVisualResult> {
  const res = await fetch('/api/visual/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }

  return (await res.json()) as GeneratedVisualResult
}
