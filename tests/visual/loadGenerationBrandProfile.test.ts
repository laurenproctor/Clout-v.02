// tests/visual/loadGenerationBrandProfile.test.ts
// Unit tests for the generation brand-profile loader. Backs the acceptance criteria:
// partial-profile hierarchy (no null poisoning — usable if EITHER row exists), precise
// camelCase render-field mapping, and null only when neither row exists.
import { describe, it, expect } from 'vitest'
import { loadGenerationBrandProfile } from '@/lib/visual/brand/loadGenerationBrandProfile'

const IDENTITY = {
  primary_color: '#101820', secondary_color: '#FFFFFF', accent_color: '#D4A574',
  font_heading: 'Playfair Display', font_body: 'Inter',
  font_heading_url: 'https://f/heading.woff2', font_body_url: 'https://f/body.woff2',
  tone_traits: ['authoritative'], style_traits: { border_radius: 'sharp' },
  signature_template_id: 'sig-1',
}
const IMAGERY = {
  visual_styles: ['Editorial'], imagery_type: '["Photography"]', composition: 'Centered',
  overlay_text_style: 'Headline Overlay', mood_traits: ['Premium'], negative_rules: ['no stock photos'],
}

// Minimal Supabase stub: from(table) → resolves maybeSingle() with that table's row.
function stubSupabase(rows: { brand_profiles?: unknown; brand_imagery_profiles?: unknown }) {
  return {
    from(table: string) {
      const data = (rows as Record<string, unknown>)[table] ?? null
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data }) }) }),
      }
    },
  } as never
}

describe('loadGenerationBrandProfile', () => {
  it('returns null when neither row exists', async () => {
    const result = await loadGenerationBrandProfile('ws', stubSupabase({}))
    expect(result).toBeNull()
  })

  it('maps the exact camelCase render fields generateImage reads', async () => {
    const result = await loadGenerationBrandProfile('ws', stubSupabase({ brand_profiles: IDENTITY, brand_imagery_profiles: IMAGERY }))
    expect(result).not.toBeNull()
    const p = result!.profile
    expect(p.fontHeading).toBe('Playfair Display')
    expect(p.fontBody).toBe('Inter')
    expect(p.fontHeadingUrl).toBe('https://f/heading.woff2')
    expect(p.fontBodyUrl).toBe('https://f/body.woff2')
    expect(p.primaryColor).toBe('#101820')
    expect(p.secondaryColor).toBe('#FFFFFF')
    expect(p.accentColor).toBe('#D4A574')
    expect(p.signatureTemplateId).toBe('sig-1')
    expect(p.styleTrait_borderRadius).toBe('sharp')
    expect(result!.sources).toEqual({ identity: true, imagery: true })
  })

  it('works with identity only (colors/fonts present, imagery defaults)', async () => {
    const result = await loadGenerationBrandProfile('ws', stubSupabase({ brand_profiles: IDENTITY }))
    expect(result).not.toBeNull()
    expect(result!.profile.fontHeading).toBe('Playfair Display')
    expect(result!.sources).toEqual({ identity: true, imagery: false })
  })

  it('works with imagery only (no render fields, semantics present)', async () => {
    const result = await loadGenerationBrandProfile('ws', stubSupabase({ brand_imagery_profiles: IMAGERY }))
    expect(result).not.toBeNull()
    expect(result!.profile.fontHeading).toBeUndefined()
    expect(result!.profile.visualStyles).toContain('Editorial')
    expect(result!.profile.negativeRules).toContain('no stock photos')
    expect(result!.sources).toEqual({ identity: false, imagery: true })
  })
})
