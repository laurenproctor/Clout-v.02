// tests/visual/buildBrandTokens.test.ts
// Backs the image-identity fixes at the pure token layer:
//  - the brand heading/body font always passes through (no imagery-profile gate) — A1
//  - overlay-supplied colors/fonts are what the tokens carry (precedence) — A3
//  - brand style traits (border_radius) flow from the semantic/raw inputs — A3
import { describe, it, expect } from 'vitest'
import { buildBrandTokens } from '@/lib/visual/brand/buildBrandTokens'
import { normalizeBrandIdentity } from '@/lib/visual/brand/normalizeBrandIdentity'

const MINIMAL = normalizeBrandIdentity(null, null)

describe('buildBrandTokens', () => {
  it('passes the brand heading/body font through even with a minimal (no-imagery) profile', () => {
    const tokens = buildBrandTokens(
      { primaryColor: '#101820', secondaryColor: '#FFFFFF', accentColor: '#D4A574', fontHeading: 'Playfair Display', fontBody: 'Inter' },
      MINIMAL,
    )
    expect(tokens.fontHeading).toBe('Playfair Display')
    expect(tokens.fontBody).toBe('Inter')
  })

  it('falls back to system-ui only when no font is supplied', () => {
    const tokens = buildBrandTokens(
      { primaryColor: '#000000', secondaryColor: '#FFFFFF', accentColor: '#D4A574', fontHeading: '', fontBody: '' },
      MINIMAL,
    )
    expect(tokens.fontHeading).toBe('system-ui')
    expect(tokens.fontBody).toBe('system-ui')
  })

  it('carries overlay-supplied colors (user override wins) into surface/accent', () => {
    const tokens = buildBrandTokens(
      { primaryColor: '#FFFFFF', secondaryColor: '#222222', accentColor: '#FF0055', fontHeading: 'Inter', fontBody: 'Inter' },
      MINIMAL,
    )
    expect(tokens.surface).toBe('#FFFFFF')
    expect(tokens.accent).toBe('#FF0055')
  })

  it('resolves border radius from the brand style trait', () => {
    const sharp = buildBrandTokens(
      { primaryColor: '#101820', secondaryColor: '#FFFFFF', accentColor: '#D4A574', fontHeading: 'Inter', fontBody: 'Inter', styleTrait_borderRadius: 'sharp' },
      MINIMAL,
    )
    expect(sharp.borderRadius).toBe('none')

    const subtle = buildBrandTokens(
      { primaryColor: '#101820', secondaryColor: '#FFFFFF', accentColor: '#D4A574', fontHeading: 'Inter', fontBody: 'Inter', styleTrait_borderRadius: 'subtle' },
      MINIMAL,
    )
    expect(subtle.borderRadius).toBe('subtle')
  })
})
