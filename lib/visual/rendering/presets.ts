// lib/visual/rendering/presets.ts
// Platform → pixel dimensions mapping.
// Callers use getRenderPreset() instead of hardcoding sizes.

import type { AspectRatio, VisualPlatform } from '../types/visual'

export interface RenderPreset {
  width: number
  height: number
  aspectRatio: AspectRatio
}

const PRESETS: Record<string, RenderPreset> = {
  'linkedin':           { width: 1200, height: 627,  aspectRatio: 'landscape' },
  'x':                  { width: 1200, height: 675,  aspectRatio: 'landscape' },
  'instagram-square':   { width: 1080, height: 1080, aspectRatio: 'square' },
  'instagram-portrait': { width: 1080, height: 1350, aspectRatio: 'portrait' },
  'og-image':           { width: 1200, height: 630,  aspectRatio: 'landscape' },
  'newsletter':         { width: 600,  height: 400,  aspectRatio: 'landscape' },
  'blog':               { width: 1200, height: 630,  aspectRatio: 'landscape' },
}

export function getRenderPreset(platform: VisualPlatform, aspectRatio: AspectRatio): RenderPreset | null {
  const key = platform === 'instagram'
    ? `instagram-${aspectRatio}`
    : platform
  return PRESETS[key] ?? null
}
