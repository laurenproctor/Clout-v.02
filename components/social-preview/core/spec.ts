/**
 * Per-platform preview spec — the single source of layout/visual facts each
 * renderer reads. Numbers are representative of how each platform presents a
 * feed post; they are NOT a claim of pixel-perfect official rendering.
 *
 * Palettes are fixed per platform (a LinkedIn card looks like LinkedIn even
 * inside Clout's dark theme). Previews never inherit Clout app tokens.
 */

import type { PreviewPlatform, PreviewTheme } from './types'

export interface PreviewPalette {
  background: string
  surface: string
  text: string
  muted: string
  border: string
  brand: string
}

export type AvatarShape = 'circle' | 'rounded'
export type MediaChrome = 'card' | 'rounded' | 'flat'

export interface PlatformPreviewSpec {
  /** Native (mode=full) card width in px. Renderers author at this width. */
  baseWidth: number
  avatarSize: number
  avatarShape: AvatarShape
  /** Default media aspect ratio (numeric w/h) when the asset doesn't specify one. */
  defaultRatio: number
  /** Aspect ratios the platform supports for feed media. */
  supportedRatios: number[]
  /** Chars shown before a "see more" affordance; null = no truncation. */
  seeMoreAfterChars: number | null
  mediaChrome: MediaChrome
  supportsCarousel: boolean
  /** Default font stack for the card (kept generic — we don't bundle brand fonts). */
  fontFamily: string
  palette: { light: PreviewPalette; dark: PreviewPalette }
}

// Common system font stacks (we do not claim official platform fonts).
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const SERIF = 'Georgia, "Times New Roman", serif'

export const PLATFORM_PREVIEW_SPEC: Record<PreviewPlatform, PlatformPreviewSpec> = {
  linkedin: {
    baseWidth: 552,
    avatarSize: 48,
    avatarShape: 'circle',
    defaultRatio: 1,
    supportedRatios: [1.91, 1, 4 / 5],
    seeMoreAfterChars: 140,
    mediaChrome: 'flat',
    supportsCarousel: true,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#191919', muted: '#666666', border: '#e0e0e0', brand: '#0a66c2' },
      dark:  { background: '#1b1f23', surface: '#1b1f23', text: '#f3f2ef', muted: '#b0b0b0', border: '#343a40', brand: '#70b5f9' },
    },
  },
  x: {
    baseWidth: 520,
    avatarSize: 40,
    avatarShape: 'circle',
    defaultRatio: 16 / 9,
    supportedRatios: [16 / 9, 1],
    seeMoreAfterChars: null,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#0f1419', muted: '#536471', border: '#eff3f4', brand: '#000000' },
      dark:  { background: '#000000', surface: '#000000', text: '#e7e9ea', muted: '#71767b', border: '#2f3336', brand: '#ffffff' },
    },
  },
  threads: {
    baseWidth: 520,
    avatarSize: 40,
    avatarShape: 'circle',
    defaultRatio: 1,
    supportedRatios: [1, 4 / 5, 1.91],
    seeMoreAfterChars: null,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#101010', muted: '#999999', border: '#e0e0e0', brand: '#000000' },
      dark:  { background: '#101010', surface: '#101010', text: '#f5f5f5', muted: '#777777', border: '#2a2a2a', brand: '#ffffff' },
    },
  },
  instagram: {
    baseWidth: 470,
    avatarSize: 32,
    avatarShape: 'circle',
    defaultRatio: 1,
    supportedRatios: [1, 4 / 5, 1.91],
    seeMoreAfterChars: 125,
    mediaChrome: 'flat',
    supportsCarousel: true,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#262626', muted: '#8e8e8e', border: '#dbdbdb', brand: '#0095f6' },
      dark:  { background: '#000000', surface: '#000000', text: '#f5f5f5', muted: '#a8a8a8', border: '#262626', brand: '#0095f6' },
    },
  },
  facebook: {
    baseWidth: 520,
    avatarSize: 40,
    avatarShape: 'circle',
    defaultRatio: 1.91,
    supportedRatios: [1.91, 1, 4 / 5],
    seeMoreAfterChars: 480,
    mediaChrome: 'flat',
    supportsCarousel: true,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#050505', muted: '#65676b', border: '#ced0d4', brand: '#1877f2' },
      dark:  { background: '#242526', surface: '#242526', text: '#e4e6eb', muted: '#b0b3b8', border: '#3e4042', brand: '#2d88ff' },
    },
  },
  bluesky: {
    baseWidth: 520,
    avatarSize: 42,
    avatarShape: 'circle',
    defaultRatio: 16 / 9,
    supportedRatios: [16 / 9, 1],
    seeMoreAfterChars: null,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#0b0f14', muted: '#697787', border: '#e1e8ed', brand: '#1083fe' },
      dark:  { background: '#161e27', surface: '#161e27', text: '#f1f3f5', muted: '#8c9eb0', border: '#2a3441', brand: '#1083fe' },
    },
  },
  mastodon: {
    baseWidth: 520,
    avatarSize: 46,
    avatarShape: 'rounded',
    defaultRatio: 16 / 9,
    supportedRatios: [16 / 9, 1],
    seeMoreAfterChars: null,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#191b22', muted: '#606984', border: '#e6e9f0', brand: '#6364ff' },
      dark:  { background: '#191b22', surface: '#1f232b', text: '#f2f3f5', muted: '#9baec8', border: '#393f4f', brand: '#858afa' },
    },
  },
  google_business: {
    baseWidth: 480,
    avatarSize: 40,
    avatarShape: 'circle',
    defaultRatio: 4 / 3,
    supportedRatios: [4 / 3, 1],
    seeMoreAfterChars: 100,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#202124', muted: '#5f6368', border: '#dadce0', brand: '#1a73e8' },
      dark:  { background: '#202124', surface: '#2a2b2e', text: '#e8eaed', muted: '#9aa0a6', border: '#3c4043', brand: '#8ab4f8' },
    },
  },
  tiktok: {
    baseWidth: 320,
    avatarSize: 48,
    avatarShape: 'circle',
    defaultRatio: 9 / 16,
    supportedRatios: [9 / 16],
    seeMoreAfterChars: 150,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#000000', surface: '#000000', text: '#ffffff', muted: '#c4c4c4', border: '#1f1f1f', brand: '#fe2c55' },
      dark:  { background: '#000000', surface: '#000000', text: '#ffffff', muted: '#c4c4c4', border: '#1f1f1f', brand: '#fe2c55' },
    },
  },
  substack: {
    baseWidth: 560,
    avatarSize: 36,
    avatarShape: 'circle',
    defaultRatio: 2,
    supportedRatios: [2, 16 / 9],
    seeMoreAfterChars: null,
    mediaChrome: 'flat',
    supportsCarousel: false,
    fontFamily: SERIF,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#1a1a1a', muted: '#757575', border: '#e7e7e7', brand: '#ff6719' },
      dark:  { background: '#1c1c1c', surface: '#1c1c1c', text: '#f0f0f0', muted: '#9b9b9b', border: '#333333', brand: '#ff6719' },
    },
  },
  article: {
    baseWidth: 560,
    avatarSize: 40,
    avatarShape: 'circle',
    defaultRatio: 2,
    supportedRatios: [2, 16 / 9],
    seeMoreAfterChars: null,
    mediaChrome: 'flat',
    supportsCarousel: false,
    fontFamily: SERIF,
    palette: {
      light: { background: '#ffffff', surface: '#ffffff', text: '#242424', muted: '#6b6b6b', border: '#e6e6e6', brand: '#1a8917' },
      dark:  { background: '#1a1a1a', surface: '#1a1a1a', text: '#eaeaea', muted: '#9a9a9a', border: '#333333', brand: '#4caf50' },
    },
  },
  fallback: {
    baseWidth: 480,
    avatarSize: 40,
    avatarShape: 'circle',
    defaultRatio: 1.91,
    supportedRatios: [1.91, 1],
    seeMoreAfterChars: null,
    mediaChrome: 'rounded',
    supportsCarousel: false,
    fontFamily: SANS,
    palette: {
      light: { background: '#ffffff', surface: '#fafafa', text: '#27272a', muted: '#71717a', border: '#e4e4e7', brand: '#52525b' },
      dark:  { background: '#18181b', surface: '#1f1f23', text: '#e4e4e7', muted: '#a1a1aa', border: '#3f3f46', brand: '#a1a1aa' },
    },
  },
}

export function getSpec(platform: PreviewPlatform): PlatformPreviewSpec {
  return PLATFORM_PREVIEW_SPEC[platform] ?? PLATFORM_PREVIEW_SPEC.fallback
}

export function getPalette(platform: PreviewPlatform, theme: PreviewTheme): PreviewPalette {
  return getSpec(platform).palette[theme]
}

/**
 * Parse an aspect-ratio string ("1:1", "4:5", "16:9", "1.91:1") or number into
 * a numeric width/height ratio. Returns the platform default when unparseable.
 */
export function parseAspectRatio(
  raw: string | number | null | undefined,
  platform: PreviewPlatform,
): number {
  const fallback = getSpec(platform).defaultRatio
  if (raw == null) return fallback
  if (typeof raw === 'number') return raw > 0 ? raw : fallback

  const trimmed = raw.trim()
  // "w:h" form
  if (trimmed.includes(':')) {
    const [w, h] = trimmed.split(':').map(Number)
    if (Number.isFinite(w) && Number.isFinite(h) && h > 0) return w / h
    return fallback
  }
  // bare number form ("1.91")
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Snap a ratio to the nearest supported ratio for the platform. */
export function clampToPlatform(ratio: number, platform: PreviewPlatform): number {
  const { supportedRatios, defaultRatio } = getSpec(platform)
  if (!supportedRatios.length) return ratio || defaultRatio
  if (!Number.isFinite(ratio) || ratio <= 0) return defaultRatio
  return supportedRatios.reduce(
    (best, r) => (Math.abs(r - ratio) < Math.abs(best - ratio) ? r : best),
    supportedRatios[0],
  )
}
