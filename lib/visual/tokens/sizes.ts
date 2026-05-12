// lib/visual/tokens/sizes.ts
// Platform × aspect ratio pixel dimensions for template rendering.
// Generate ONE canonical composition per platform. Resize at delivery, not at render.

import type { AspectRatio, VisualPlatform } from '../types/visual'

export const PLATFORM_SIZES: Record<VisualPlatform, Record<AspectRatio, { width: number; height: number }>> = {
  linkedin:   { landscape: { width: 1200, height: 627 },  portrait: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 } },
  x:          { landscape: { width: 1600, height: 900 },  portrait: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 } },
  instagram:  { landscape: { width: 1080, height: 566 },  portrait: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 } },
  newsletter: { landscape: { width: 1200, height: 630 },  portrait: { width: 600,  height: 900  }, square: { width: 600,  height: 600  } },
  blog:       { landscape: { width: 1200, height: 630 },  portrait: { width: 800,  height: 1000 }, square: { width: 800,  height: 800  } },
}

export function getPlatformSize(platform: VisualPlatform, aspectRatio: AspectRatio): { width: number; height: number } {
  return PLATFORM_SIZES[platform]?.[aspectRatio] ?? { width: 1200, height: 627 }
}
