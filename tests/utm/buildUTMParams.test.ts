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
