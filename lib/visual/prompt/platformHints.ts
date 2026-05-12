// lib/visual/prompt/platformHints.ts
// Per-platform composition guidance injected into image prompts.
// Lives here — not in generateVisualIntent or business logic.

import type { VisualPlatform } from '../types/visual'

const HINTS: Record<VisualPlatform, string> = {
  linkedin:   'professional context, clean negative space, minimal clutter, suitable for a business feed',
  x:          'bold visual contrast, immediately legible at thumbnail size, high-impact composition',
  instagram:  'editorial photography quality, strong aesthetic, visually striking at full bleed',
  newsletter: 'warm and trustworthy, editorial photography style, readers are calm and attentive',
  blog:       'wide editorial hero format, rich texture, information-dense composition',
}

export function getPlatformHint(platform: VisualPlatform): string {
  return HINTS[platform]
}
