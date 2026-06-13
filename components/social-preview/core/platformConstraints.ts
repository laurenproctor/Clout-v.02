/**
 * Client-safe platform constraints.
 *
 * This file contains ONLY serializable constants (char limits, carousel
 * support, labels). It deliberately does NOT import from
 * `lib/syndication/registry.ts` or `lib/providers/registry.ts`, which may pull
 * in server-only code (env access, provider SDKs, DB helpers) that would break
 * the client bundle.
 *
 * If the publishing/provider registries need these same numbers, they should
 * import FROM this file — not the other way around.
 */

import type { PreviewPlatform } from './types'

export interface PlatformLimit {
  /** Soft character limit, or null when effectively unlimited. */
  charLimit: number | null
  supportsCarousel: boolean
  /** Human label for the platform. */
  label: string
}

export const PLATFORM_LIMITS: Record<PreviewPlatform, PlatformLimit> = {
  linkedin:        { charLimit: 3000, supportsCarousel: true,  label: 'LinkedIn' },
  x:               { charLimit: 280,  supportsCarousel: false, label: 'X' },
  threads:         { charLimit: 500,  supportsCarousel: false, label: 'Threads' },
  instagram:       { charLimit: 2200, supportsCarousel: true,  label: 'Instagram' },
  facebook:        { charLimit: null, supportsCarousel: true,  label: 'Facebook' },
  bluesky:         { charLimit: 300,  supportsCarousel: false, label: 'Bluesky' },
  mastodon:        { charLimit: 500,  supportsCarousel: false, label: 'Mastodon' },
  google_business: { charLimit: 1500, supportsCarousel: false, label: 'Google Business' },
  tiktok:          { charLimit: 2200, supportsCarousel: false, label: 'TikTok' },
  substack:        { charLimit: null, supportsCarousel: false, label: 'Substack' },
  article:         { charLimit: null, supportsCarousel: false, label: 'Article' },
  fallback:        { charLimit: null, supportsCarousel: false, label: 'Preview' },
}

export function getPlatformLimit(platform: PreviewPlatform): PlatformLimit {
  return PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.fallback
}
