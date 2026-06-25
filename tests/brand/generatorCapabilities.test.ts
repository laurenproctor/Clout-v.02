// tests/brand/generatorCapabilities.test.ts
// Guards the brand-capabilities registry: stable shape, no duplicates, and the invariants that
// encode the architecture (only the visual generator renders identity/diagnostics; custom fonts
// only where identity is applied; voice-only generators don't claim visual surfaces).
import { describe, it, expect } from 'vitest'
import { GENERATOR_BRAND_CAPABILITIES, getGeneratorBrandCapabilities } from '@/lib/brand/generatorCapabilities'

describe('GENERATOR_BRAND_CAPABILITIES', () => {
  it('has unique ids and routes', () => {
    const ids = GENERATOR_BRAND_CAPABILITIES.map(c => c.id)
    const routes = GENERATOR_BRAND_CAPABILITIES.map(c => c.route)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('every route is an /api/ path', () => {
    for (const c of GENERATOR_BRAND_CAPABILITIES) {
      expect(c.route.startsWith('/api/'), `${c.id} route`).toBe(true)
    }
  })

  it('every generator applies at least one brand surface', () => {
    for (const c of GENERATOR_BRAND_CAPABILITIES) {
      expect(c.usesBrandVoice || c.usesBrandIdentity || c.usesBrandImagery, `${c.id} applies no brand surface`).toBe(true)
    }
  })

  it('only identity-applying generators can support custom fonts or record diagnostics', () => {
    for (const c of GENERATOR_BRAND_CAPABILITIES) {
      if (c.supportsCustomFonts || c.recordsBrandDiagnostics) {
        expect(c.usesBrandIdentity, `${c.id} claims font/diagnostics without identity`).toBe(true)
      }
    }
  })

  it('image is the visual generator (identity + custom fonts + diagnostics)', () => {
    const image = getGeneratorBrandCapabilities('image')
    expect(image).toBeTruthy()
    expect(image!.usesBrandIdentity).toBe(true)
    expect(image!.supportsCustomFonts).toBe(true)
    expect(image!.recordsBrandDiagnostics).toBe(true)
  })

  it('the wired text generators all apply brand voice', () => {
    for (const id of ['instagram', 'threads', 'linkedin', 'note', 'blog', 'substack', 'draft']) {
      expect(getGeneratorBrandCapabilities(id)?.usesBrandVoice, `${id}`).toBe(true)
    }
  })

  it('lookup returns undefined for unknown generators', () => {
    expect(getGeneratorBrandCapabilities('nope')).toBeUndefined()
  })
})
