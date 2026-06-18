import { describe, it, expect } from 'vitest'
import { buildUTMParams } from '@/lib/analytics/utm'
import type { UTMTemplateSettings } from '@/lib/distribution/platform-registry'

const BASE = {
  platform: 'linkedin',
  canonicalId: 'aaaabbbbccccdddd',
  outputId:    'eeeeffffgggghhhh',
  customSources: {
    linkedin: { source: 'linkedin', medium: 'social' },
  },
}

const TEMPLATES: UTMTemplateSettings = {
  campaign: { token: 'auto',    fallback: 'clout'     },
  content:  { token: 'auto',    fallback: 'post'      },
  term:     { token: 'none',    fallback: ''          },
}

describe('buildUTMParams — auto tokens (current behaviour)', () => {
  it('produces auto-ID campaign and content when tokens are auto', () => {
    const p = buildUTMParams({ ...BASE, templates: TEMPLATES })
    expect(p.utm_campaign).toBe('clout_c_aaaabbbbcccc')
    expect(p.utm_content).toBe('out_eeeeffffgggg')
    expect(p.utm_term).toBeUndefined()
  })
})

describe('buildUTMParams — campaign_name token', () => {
  it('uses campaignName when available', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { campaignName: 'My Big Launch' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('my-big-launch')
  })

  it('normalizes campaignName (lowercase, spaces → hyphens)', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { campaignName: 'Hello World' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('hello-world')
  })

  it('falls back when campaignName is empty', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { campaignName: '' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('clout')
  })

  it('falls back when outputContext is absent', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('clout')
  })
})

describe('buildUTMParams — custom campaign token', () => {
  it('uses fallback string directly', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, campaign: { token: 'custom', fallback: 'q1-push' } },
    })
    expect(p.utm_campaign).toBe('q1-push')
  })
})

describe('buildUTMParams — cta token for content', () => {
  it('uses first CTA suggestion', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { cta: 'Book a demo' },
      templates: { ...TEMPLATES, content: { token: 'cta', fallback: 'read-more' } },
    })
    expect(p.utm_content).toBe('book-a-demo')
  })

  it('falls back when cta is empty', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { cta: '' },
      templates: { ...TEMPLATES, content: { token: 'cta', fallback: 'read-more' } },
    })
    expect(p.utm_content).toBe('read-more')
  })
})

describe('buildUTMParams — term tokens', () => {
  it('omits utm_term when token is none', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, term: { token: 'none', fallback: '' } },
    })
    expect(p.utm_term).toBeUndefined()
  })

  it('uses lens name when available', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { lensName: 'Framework Lens' },
      templates: { ...TEMPLATES, term: { token: 'lens', fallback: 'no-lens' } },
    })
    expect(p.utm_term).toBe('framework-lens')
  })

  it('falls back when lensName missing', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, term: { token: 'lens', fallback: 'no-lens' } },
    })
    expect(p.utm_term).toBe('no-lens')
  })

  it('uses voice register', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { voice: 'executive' },
      templates: { ...TEMPLATES, term: { token: 'voice', fallback: 'standard' } },
    })
    expect(p.utm_term).toBe('executive')
  })

  it('uses custom term value', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, term: { token: 'custom', fallback: 'q1' } },
    })
    expect(p.utm_term).toBe('q1')
  })
})

describe('buildUTMParams — medium token (per-platform)', () => {
  it('uses static medium when no mediumToken set', () => {
    const p = buildUTMParams({ ...BASE, templates: TEMPLATES })
    expect(p.utm_medium).toBe('social')
  })

  it('uses campaign_name token for medium', () => {
    const p = buildUTMParams({
      ...BASE,
      customSources: { linkedin: { source: 'linkedin', medium: 'social', mediumToken: 'campaign_name' } },
      outputContext: { campaignName: 'Product Launch' },
      templates: TEMPLATES,
    })
    expect(p.utm_medium).toBe('product-launch')
  })

  it('falls back to static medium when campaign_name token has no value', () => {
    const p = buildUTMParams({
      ...BASE,
      customSources: { linkedin: { source: 'linkedin', medium: 'social', mediumToken: 'campaign_name' } },
      templates: TEMPLATES,
    })
    expect(p.utm_medium).toBe('social')
  })
})

describe('buildUTMParams — no templates provided', () => {
  it('preserves existing auto-ID behaviour', () => {
    const p = buildUTMParams(BASE)
    expect(p.utm_campaign).toBe('clout_c_aaaabbbbcccc')
    expect(p.utm_content).toBe('out_eeeeffffgggg')
    expect(p.utm_term).toBeUndefined()
  })
})

describe('buildUTMParams — date token', () => {
  // Fixed local date: 7 June 2026
  const NOW = new Date(2026, 5, 7)

  it('generates the campaign from the date using its dateFormat', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, campaign: { token: 'date', fallback: '', dateFormat: 'yyyy-mm-dd' } },
    })
    expect(p.utm_campaign).toBe('2026-06-07')
  })

  it('generates the content from the date using its dateFormat', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, content: { token: 'date', fallback: '', dateFormat: 'mmm-yyyy' } },
    })
    expect(p.utm_content).toBe('jun-2026')
  })

  it('generates the term from the date using its dateFormat', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, term: { token: 'date', fallback: '', dateFormat: 'yyyy-mm' } },
    })
    expect(p.utm_term).toBe('2026-06')
  })

  it('defaults to DEFAULT_UTM_DATE_FORMAT (yyyy-mm) when no dateFormat is set', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, campaign: { token: 'date', fallback: '' } },
    })
    expect(p.utm_campaign).toBe('2026-06')
  })

  it('ignores any fallback string when the token is date', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, campaign: { token: 'date', fallback: 'should-be-ignored', dateFormat: 'yyyy' } },
    })
    expect(p.utm_campaign).toBe('2026')
  })
})

describe('buildUTMParams — date fallback for dynamic tokens', () => {
  // Fixed local date: 7 June 2026
  const NOW = new Date(2026, 5, 7)

  it('uses the resolved campaign_name when present, ignoring the date fallback', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      outputContext: { campaignName: 'My Big Launch' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: '', fallbackKind: 'date', dateFormat: 'yyyy-mm-dd' } },
    })
    expect(p.utm_campaign).toBe('my-big-launch')
  })

  it('falls back to a generated date when campaign_name is empty', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      outputContext: { campaignName: '' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: '', fallbackKind: 'date', dateFormat: 'yyyy-mm-dd' } },
    })
    expect(p.utm_campaign).toBe('2026-06-07')
  })

  it('falls back to a generated date for content (cta) when empty', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, content: { token: 'cta', fallback: '', fallbackKind: 'date', dateFormat: 'mmm-yyyy' } },
    })
    expect(p.utm_content).toBe('jun-2026')
  })

  it('falls back to a generated date for term (lens) when empty', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, term: { token: 'lens', fallback: '', fallbackKind: 'date', dateFormat: 'yyyy-mm' } },
    })
    expect(p.utm_term).toBe('2026-06')
  })

  it('falls back to a generated date for term (voice) when empty', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, term: { token: 'voice', fallback: '', fallbackKind: 'date', dateFormat: 'yyyy' } },
    })
    expect(p.utm_term).toBe('2026')
  })

  it('defaults the date-fallback format to yyyy-mm when none is set', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: '', fallbackKind: 'date' } },
    })
    expect(p.utm_campaign).toBe('2026-06')
  })

  it('still uses the static fallback string when fallbackKind is text (default)', () => {
    const p = buildUTMParams({
      ...BASE,
      now: NOW,
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout', fallbackKind: 'text' } },
    })
    expect(p.utm_campaign).toBe('clout')
  })
})
