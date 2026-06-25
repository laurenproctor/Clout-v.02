import { describe, it, expect } from 'vitest'
import { parseAspectRatio, getSpec } from '../spec'

describe('parseAspectRatio', () => {
  describe('semantic keywords', () => {
    it('resolves linkedin keywords to the generated canvas ratios', () => {
      expect(parseAspectRatio('landscape', 'linkedin')).toBeCloseTo(1200 / 627, 5)
      expect(parseAspectRatio('square', 'linkedin')).toBe(1)
      expect(parseAspectRatio('portrait', 'linkedin')).toBeCloseTo(1080 / 1350, 5)
    })

    it('is case- and whitespace-insensitive', () => {
      expect(parseAspectRatio(' Landscape ', 'linkedin')).toBeCloseTo(1200 / 627, 5)
      expect(parseAspectRatio('LANDSCAPE', 'linkedin')).toBeCloseTo(1200 / 627, 5)
    })

    it('uses per-platform semantic ratios for x and instagram', () => {
      expect(parseAspectRatio('landscape', 'x')).toBeCloseTo(1600 / 900, 5)
      expect(parseAspectRatio('landscape', 'instagram')).toBeCloseTo(1080 / 566, 5)
    })

    it('falls back to widest/tallest supported ratio when no semantic ratio is configured', () => {
      // facebook has no semanticRatios — landscape → widest supported, portrait → tallest.
      const fb = getSpec('facebook')
      expect(parseAspectRatio('landscape', 'facebook')).toBe(Math.max(...fb.supportedRatios))
      expect(parseAspectRatio('portrait', 'facebook')).toBe(Math.min(...fb.supportedRatios))
    })
  })

  describe('explicit numeric / w:h formats are unchanged', () => {
    it('parses "w:h" strings', () => {
      expect(parseAspectRatio('16:9', 'linkedin')).toBeCloseTo(16 / 9, 5)
      expect(parseAspectRatio('4:5', 'linkedin')).toBeCloseTo(0.8, 5)
    })

    it('parses bare-number strings and numbers', () => {
      expect(parseAspectRatio('1.91', 'linkedin')).toBeCloseTo(1.91, 5)
      expect(parseAspectRatio(1.91, 'linkedin')).toBeCloseTo(1.91, 5)
    })
  })

  describe('fallbacks', () => {
    const fallback = getSpec('linkedin').defaultRatio

    it('returns the platform default for empty/whitespace/unparseable input', () => {
      expect(parseAspectRatio('', 'linkedin')).toBe(fallback)
      expect(parseAspectRatio('   ', 'linkedin')).toBe(fallback)
      expect(parseAspectRatio('banana', 'linkedin')).toBe(fallback)
      expect(parseAspectRatio(null, 'linkedin')).toBe(fallback)
      expect(parseAspectRatio(undefined, 'linkedin')).toBe(fallback)
      expect(parseAspectRatio(0, 'linkedin')).toBe(fallback)
    })
  })
})
