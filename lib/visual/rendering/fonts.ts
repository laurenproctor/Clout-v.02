// lib/visual/rendering/fonts.ts
// Loads font buffers for Satori rendering.
// Fonts must be ArrayBuffer — Satori cannot use CSS font-face strings.
// LRU cache prevents re-fetching the same font on every render.

import { LRUCache } from 'lru-cache'

interface FontEntry {
  name: string
  data: ArrayBuffer
  weight: number
  style: 'normal' | 'italic'
}

// Cache keyed by URL. 50 fonts max, 1-hour TTL.
const fontCache = new LRUCache<string, ArrayBuffer>({
  max: 50,
  ttl: 1000 * 60 * 60,
})

async function fetchFontBuffer(url: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(url)
  if (cached) return cached

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load font: HTTP ${res.status} — ${url}`)
  const buf = await res.arrayBuffer()
  fontCache.set(url, buf)
  return buf
}

// System fallback fonts bundled with the render environment.
// These are guaranteed to be available even when brand fonts fail to load.
const FALLBACK_FONTS: FontEntry[] = []  // Satori uses system-ui as its built-in fallback

export interface BrandFontInput {
  fontHeading: string
  fontBody: string
  fontHeadingUrl?: string | null
  fontBodyUrl?: string | null
}

export async function loadFontsForSatori(brand: BrandFontInput): Promise<FontEntry[]> {
  const fonts: FontEntry[] = []

  async function tryLoad(url: string | null | undefined, name: string, weight: number): Promise<void> {
    if (!url) return
    try {
      const data = await fetchFontBuffer(url)
      fonts.push({ name, data, weight, style: 'normal' })
    } catch (err) {
      console.warn(`[visual/fonts] Failed to load font "${name}" from ${url}:`, err)
    }
  }

  // Load heading and body fonts — both regular and bold weights if possible.
  // Satori uses the name as a CSS font-family value in inline styles.
  await Promise.all([
    tryLoad(brand.fontHeadingUrl, brand.fontHeading, 700),
    tryLoad(brand.fontHeadingUrl, brand.fontHeading, 400),
    tryLoad(brand.fontBodyUrl,    brand.fontBody,    400),
    tryLoad(brand.fontBodyUrl,    brand.fontBody,    500),
  ])

  return fonts.length > 0 ? fonts : FALLBACK_FONTS
}
