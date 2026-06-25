// tests/visual/fontFace.test.ts
// The Puppeteer @font-face format() hint must match the uploaded file's extension, or the
// browser may skip the source. Backs the brand-font upload formats (.woff2/.woff/.ttf/.otf).
import { describe, it, expect } from 'vitest'
import { fontFaceRule, fontFormatForUrl } from '@/components/visual/templates/puppeteer/fontFace'

describe('fontFormatForUrl', () => {
  it('maps each supported extension to its CSS format token', () => {
    expect(fontFormatForUrl('https://x/f.woff2')).toBe('woff2')
    expect(fontFormatForUrl('https://x/f.woff')).toBe('woff')
    expect(fontFormatForUrl('https://x/f.ttf')).toBe('truetype')
    expect(fontFormatForUrl('https://x/f.otf')).toBe('opentype')
  })
  it('ignores query/hash and is case-insensitive', () => {
    expect(fontFormatForUrl('https://x/font-heading.TTF?v=2')).toBe('truetype')
    expect(fontFormatForUrl('https://x/f.OTF#frag')).toBe('opentype')
  })
  it('defaults to woff2 for unknown extensions', () => {
    expect(fontFormatForUrl('https://x/f.eot')).toBe('woff2')
    expect(fontFormatForUrl('https://x/noext')).toBe('woff2')
  })
})

describe('fontFaceRule', () => {
  it('returns empty when no URL', () => {
    expect(fontFaceRule('Signifier', undefined)).toBe('')
  })
  it('emits a format() hint matching the file (not always woff2)', () => {
    const ttf = fontFaceRule('Signifier', 'https://x/font-heading.ttf')
    expect(ttf).toContain('font-family: "Signifier"')
    expect(ttf).toContain("format(\"truetype\")")
    expect(ttf).not.toContain('woff2')
  })
  it('still emits woff2 for woff2 files', () => {
    expect(fontFaceRule('Manrope', 'https://x/m.woff2')).toContain("format(\"woff2\")")
  })
})
