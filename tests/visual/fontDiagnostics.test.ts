// tests/visual/fontDiagnostics.test.ts
// Unit tests for brand-font classification: distinguishes custom/google/generic/system/
// unresolved/none, and tracks passedToRenderer vs resolvedUrl independently (different bug classes).
import { describe, it, expect } from 'vitest'
import { classifyBrandFont, isGenericFontFamily } from '@/lib/visual/rendering/fonts'

describe('isGenericFontFamily', () => {
  it('matches generic/system families case-insensitively', () => {
    for (const f of ['system-ui', 'Arial', 'helvetica', 'Georgia', 'Times New Roman', 'serif', 'sans-serif', 'monospace']) {
      expect(isGenericFontFamily(f)).toBe(true)
    }
  })
  it('does not match real brand fonts', () => {
    expect(isGenericFontFamily('Playfair Display')).toBe(false)
    expect(isGenericFontFamily('Signifier')).toBe(false)
    expect(isGenericFontFamily(null)).toBe(false)
  })
})

describe('classifyBrandFont', () => {
  it('custom URL beats Google lookup → source custom_url, downloadable', () => {
    const d = classifyBrandFont({ requested: 'Signifier', customUrl: 'https://f/sig.woff2', resolvedUrl: 'https://f/sig.woff2' })
    expect(d.source).toBe('custom_url')
    expect(d.passedToRenderer).toBe(true)
    expect(d.resolvedUrl).toBe('https://f/sig.woff2')
    expect(d.fallbackUsed).toBe(false)
  })

  it('Google name resolves → source google with resolvedUrl', () => {
    const d = classifyBrandFont({ requested: 'Playfair Display', resolvedUrl: 'https://fonts.gstatic.com/p.woff2' })
    expect(d.source).toBe('google')
    expect(d.passedToRenderer).toBe(true)
    expect(d.resolvedUrl).toBe('https://fonts.gstatic.com/p.woff2')
  })

  it('generic family → source generic, passed without a download', () => {
    const d = classifyBrandFont({ requested: 'Arial' })
    expect(d.source).toBe('generic')
    expect(d.passedToRenderer).toBe(true)
    expect(d.resolvedUrl).toBeNull()
    expect(d.fallbackUsed).toBe(false)
  })

  it('explicit system-ui → source system, intentional fallback (not a failure)', () => {
    const d = classifyBrandFont({ requested: 'system-ui' })
    expect(d.source).toBe('system')
    expect(d.passedToRenderer).toBe(true)
    expect(d.fallbackUsed).toBe(false)
  })

  it('non-generic font that resolves to nothing → source unresolved, fallbackUsed (the real bug signal)', () => {
    const d = classifyBrandFont({ requested: 'Obscure Custom Face', resolvedUrl: null })
    expect(d.source).toBe('unresolved')
    expect(d.passedToRenderer).toBe(false)
    expect(d.fallbackUsed).toBe(true)
    expect(d.resolvedUrl).toBeNull()
  })

  it('no font requested → source none', () => {
    const d = classifyBrandFont({ requested: null })
    expect(d.source).toBe('none')
    expect(d.passedToRenderer).toBe(false)
    expect(d.fallbackUsed).toBe(false)
  })
})
