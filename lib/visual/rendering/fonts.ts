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

// Cache for Google Fonts CSS → woff2 URL lookups. 100 entries, 24-hour TTL.
// Google Fonts URLs are stable; 24hrs avoids re-fetching on every cold start.
const googleFontUrlCache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 60 * 24,
})

/**
 * Given a Google Fonts family name (e.g. "Inter"), fetches the Google Fonts CSS2 API
 * and extracts the direct .woff2 download URL. Returns null for 'system-ui' or failures.
 * Results are cached for 24 hours — Google Fonts URLs are stable.
 */
export async function resolveGoogleFontWoff2Url(
  fontName: string | null | undefined,
  weight = 400,
): Promise<string | null> {
  if (!fontName || fontName === 'system-ui') return null
  const cacheKey = `${fontName}:${weight}`
  const cached = googleFontUrlCache.get(cacheKey)
  if (cached !== undefined) return cached || null   // '' → null (not-found sentinel)
  try {
    const encoded = fontName.replace(/\s+/g, '+')
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weight}&display=swap`
    const res = await fetch(cssUrl, {
      headers: {
        // Chrome UA required — Google returns woff2 for modern agents, woff1 for unknown
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) { googleFontUrlCache.set(cacheKey, ''); return null }
    const css = await res.text()
    // Google Fonts returns multiple @font-face blocks for Unicode ranges; the last is 'latin'
    const matches = [...css.matchAll(/src:\s*url\(([^)]+)\)\s*format\(['"]?woff2['"]?\)/g)]
    const url = matches.length > 0 ? matches[matches.length - 1][1].replace(/['"]/g, '') : ''
    googleFontUrlCache.set(cacheKey, url)
    return url || null
  } catch {
    googleFontUrlCache.set(cacheKey, '')
    return null
  }
}

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
