import { describe, it, expect, vi } from 'vitest'
import {
  normalizeChannelUrl,
  extractSocialCandidates,
  discoverCompetitorChannels,
  type DiscoverDeps,
} from '@/lib/competitors/discover-socials'

// ---------------------------------------------------------------------------
// normalizeChannelUrl — canonicalization
// ---------------------------------------------------------------------------
describe('normalizeChannelUrl', () => {
  it('collapses x.com and twitter.com (and casing/trailing slash) to one canonical form', () => {
    const a = normalizeChannelUrl('twitter', 'https://x.com/Acme/')
    const b = normalizeChannelUrl('twitter', 'http://www.twitter.com/acme')
    expect(a).toBe('https://twitter.com/acme')
    expect(b).toBe(a)
  })

  it('collapses threads.net and threads.com to one canonical form', () => {
    const a = normalizeChannelUrl('threads', 'https://www.threads.com/@acme')
    const b = normalizeChannelUrl('threads', 'https://threads.net/@acme/')
    expect(a).toBe('https://threads.net/@acme')
    expect(b).toBe(a)
  })

  it('normalizes a linkedin company URL', () => {
    expect(normalizeChannelUrl('linkedin', 'https://www.linkedin.com/company/Acme-Inc/about/'))
      .toBe('https://linkedin.com/company/acme-inc')
  })

  it('preserves YouTube channel-id casing (case-sensitive ids)', () => {
    expect(normalizeChannelUrl('youtube', 'https://www.youtube.com/channel/UCabcDEF123'))
      .toBe('https://youtube.com/channel/UCabcDEF123')
  })

  it('strips Pinterest trailing path junk', () => {
    expect(normalizeChannelUrl('pinterest', 'https://www.pinterest.com/acme/boards/'))
      .toBe('https://pinterest.com/acme')
  })

  it('rejects a reserved/non-profile slug', () => {
    expect(normalizeChannelUrl('twitter', 'https://twitter.com/intent/tweet')).toBeNull()
    expect(normalizeChannelUrl('instagram', 'https://instagram.com/p/AbCdEf')).toBeNull()
  })

  it('returns null for a URL on the wrong host for the platform', () => {
    expect(normalizeChannelUrl('twitter', 'https://example.com/acme')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// extractSocialCandidates — homepage HTML scrape (Layer 1)
// ---------------------------------------------------------------------------
describe('extractSocialCandidates', () => {
  it('extracts the new platforms (tiktok, threads, pinterest) alongside the originals', () => {
    const html = `
      <a href="https://twitter.com/acme">x</a>
      <a href="https://www.tiktok.com/@acme">tt</a>
      <a href="https://www.threads.net/@acme">th</a>
      <a href="https://pinterest.com/acme/">pin</a>
      <a href="https://instagram.com/acme">ig</a>
    `
    const found = extractSocialCandidates(html)
    expect(found.twitter).toBe('https://twitter.com/acme')
    expect(found.tiktok).toBe('https://tiktok.com/@acme')
    expect(found.threads).toBe('https://threads.net/@acme')
    expect(found.pinterest).toBe('https://pinterest.com/acme')
    expect(found.instagram).toBe('https://instagram.com/acme')
  })

  it('ignores reserved share/login links', () => {
    const html = `<a href="https://twitter.com/share?url=x">share</a>
                  <a href="https://facebook.com/sharer/sharer.php">fb</a>`
    const found = extractSocialCandidates(html)
    expect(found.twitter).toBeUndefined()
    expect(found.facebook).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// discoverCompetitorChannels — orchestration
// ---------------------------------------------------------------------------
const NOW = '2026-06-24T00:00:00.000Z'

function makeDeps(over: Partial<DiscoverDeps> = {}): DiscoverDeps {
  return {
    fetchHtml: vi.fn(async () => ''),
    webSearch: null, // kill switch off by default
    fetchProfile: vi.fn(async () => null),
    now: () => NOW,
    ...over,
  }
}

describe('discoverCompetitorChannels', () => {
  it('does NOT call web search when the homepage scrape finds every supported platform', async () => {
    const html = `
      <a href="https://twitter.com/acme">x</a>
      <a href="https://linkedin.com/company/acme">li</a>
      <a href="https://instagram.com/acme">ig</a>
      <a href="https://youtube.com/@acme">yt</a>
      <a href="https://facebook.com/acme">fb</a>
      <a href="https://www.tiktok.com/@acme">tt</a>
      <a href="https://www.threads.net/@acme">th</a>
      <a href="https://pinterest.com/acme">pin</a>`
    const webSearch = vi.fn()
    const deps = makeDeps({ fetchHtml: vi.fn(async () => html), webSearch })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(webSearch).not.toHaveBeenCalled()
    expect(result.socials.twitter).toBe('https://twitter.com/acme')
    expect(result.confidence?.twitter?.status).toBe('verified')
    expect(result.confidence?.twitter?.source).toBe('homepage')
  })

  it('never calls web search when the kill switch is off (webSearch is null)', async () => {
    const deps = makeDeps({ fetchHtml: vi.fn(async () => ''), webSearch: null })
    const result = await discoverCompetitorChannels('acme.com', deps)
    expect(result.socials.twitter).toBeUndefined()
  })

  it('fills gaps via web search and promotes a reciprocity-confirmed profile to verified socials', async () => {
    const webSearch = vi.fn(async () => ({ socials: { linkedin: 'https://linkedin.com/company/acme' } }))
    // profile page links back to the competitor domain -> reciprocity
    const fetchProfile = vi.fn(async () => ({
      ok: true, status: 200, finalUrl: 'https://linkedin.com/company/acme',
      html: '<a href="https://acme.com">Visit our site</a>',
    }))
    const deps = makeDeps({ fetchHtml: vi.fn(async () => ''), webSearch, fetchProfile })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(webSearch).toHaveBeenCalledOnce()
    expect(result.socials.linkedin).toBe('https://linkedin.com/company/acme')
    expect(result.confidence?.linkedin?.status).toBe('verified')
    expect(result.confidence?.linkedin?.source).toBe('reciprocal_link')
    expect(result.candidate_channels?.linkedin).toBeUndefined()
  })

  it('keeps an unconfirmable (common-name) profile as a candidate, NOT in socials', async () => {
    const webSearch = vi.fn(async () => ({ socials: { twitter: 'https://twitter.com/acme' } }))
    // profile exists but does not link back / no name match -> cannot confirm identity
    const fetchProfile = vi.fn(async () => ({
      ok: true, status: 200, finalUrl: 'https://twitter.com/acme',
      html: '<title>Some unrelated account</title>',
    }))
    const deps = makeDeps({ fetchHtml: vi.fn(async () => ''), webSearch, fetchProfile })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(result.socials.twitter).toBeUndefined()
    expect(result.candidate_channels?.twitter?.status).toBe('likely')
  })

  it('marks a bot-blocked (403) profile as a candidate, never verified', async () => {
    const webSearch = vi.fn(async () => ({ socials: { instagram: 'https://instagram.com/acme' } }))
    const fetchProfile = vi.fn(async () => ({ ok: false, status: 403, finalUrl: '', html: '' }))
    const deps = makeDeps({ fetchHtml: vi.fn(async () => ''), webSearch, fetchProfile })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(result.socials.instagram).toBeUndefined()
    expect(result.candidate_channels?.instagram?.status).toBe('likely')
  })

  it('drops a 404 / dead profile entirely (rejected, not persisted)', async () => {
    const webSearch = vi.fn(async () => ({ socials: { facebook: 'https://facebook.com/acme' } }))
    const fetchProfile = vi.fn(async () => ({ ok: false, status: 404, finalUrl: '', html: '' }))
    const deps = makeDeps({ fetchHtml: vi.fn(async () => ''), webSearch, fetchProfile })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(result.socials.facebook).toBeUndefined()
    expect(result.candidate_channels?.facebook).toBeUndefined()
    expect(result.confidence?.facebook).toBeUndefined()
  })

  it('falls back to Layer-1 results when web search throws', async () => {
    const html = `<a href="https://twitter.com/acme">x</a>`
    const webSearch = vi.fn(async () => { throw new Error('web search unavailable') })
    const deps = makeDeps({ fetchHtml: vi.fn(async () => html), webSearch })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(result.socials.twitter).toBe('https://twitter.com/acme')
  })

  it('returns gracefully (empty socials) for an unsafe / private domain', async () => {
    const webSearch = vi.fn()
    const deps = makeDeps({ webSearch })
    const result = await discoverCompetitorChannels('localhost', deps)
    expect(result.socials).toEqual({})
    expect(webSearch).not.toHaveBeenCalled()
  })

  it('homepage-found channel wins over a web-search candidate for the same platform', async () => {
    const html = `<a href="https://twitter.com/official">x</a>`
    const webSearch = vi.fn(async () => ({ socials: { twitter: 'https://twitter.com/imposter' } }))
    const deps = makeDeps({ fetchHtml: vi.fn(async () => html), webSearch })

    const result = await discoverCompetitorChannels('acme.com', deps)

    expect(result.socials.twitter).toBe('https://twitter.com/official')
    expect(result.confidence?.twitter?.source).toBe('homepage')
  })
})
