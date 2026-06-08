import { describe, it, expect } from 'vitest'
import {
  buildArticleContext,
  buildSystemPrompt,
  buildUserPrompt,
} from '@/lib/draft/competitorIntelHelpers'

// ── buildArticleContext ────────────────────────────────────────────────────

describe('buildArticleContext', () => {
  const base = {
    scraped: null,
    item_content: null,
    item_summary: null,
    item_title: 'AI is changing healthcare',
    item_topics: ['AI', 'Healthcare'],
  }

  it('prefers scraped content when available', () => {
    const result = buildArticleContext({ ...base, scraped: 'Full scraped article...' })
    expect(result).toContain('Full scraped article...')
  })

  it('falls back to item_content when no scraped content', () => {
    const result = buildArticleContext({ ...base, item_content: 'RSS excerpt content' })
    expect(result).toBe('RSS excerpt content')
  })

  it('falls back to item_summary when no content', () => {
    const result = buildArticleContext({ ...base, item_summary: 'Article summary here' })
    expect(result).toBe('Article summary here')
  })

  it('falls back to title + topics when all others are empty', () => {
    const result = buildArticleContext(base)
    expect(result).toContain('AI is changing healthcare')
    expect(result).toContain('AI')
    expect(result).toContain('Healthcare')
  })

  it('prefers item_content over item_summary', () => {
    const result = buildArticleContext({ ...base, item_content: 'Content', item_summary: 'Summary' })
    expect(result).toBe('Content')
  })

  it('caps scraped content at 8000 characters', () => {
    const long = 'x'.repeat(10000)
    const result = buildArticleContext({ ...base, scraped: long })
    expect(result.length).toBe(8000)
  })

  it('handles whitespace-only strings as empty', () => {
    const result = buildArticleContext({ ...base, item_content: '   ', item_summary: 'Summary' })
    expect(result).toBe('Summary')
  })
})

// ── buildSystemPrompt ──────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  const base = {
    brandName: 'Acme Corp',
    toneTraits: ['direct', 'confident'],
    contentTopics: ['Supply Chain', 'Operations'],
    services: ['Consulting', 'Training'],
    competitorDomain: 'competitor.com',
  }

  it('includes the brand name', () => {
    expect(buildSystemPrompt(base)).toContain('Acme Corp')
  })

  it('includes tone traits', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('direct')
    expect(result).toContain('confident')
  })

  it('includes content topics', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('Supply Chain')
  })

  it('includes the competitor domain in the attribution rule', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('competitor.com')
  })

  it('includes the no-attribution hard rule', () => {
    const result = buildSystemPrompt(base)
    expect(result).toContain('NON-NEGOTIABLE')
    expect(result).toContain('Do not link to')
  })

  it('handles null brandName gracefully', () => {
    const result = buildSystemPrompt({ ...base, brandName: null })
    expect(result).toBeTruthy()
    expect(result).not.toContain('null')
  })

  it('works with empty arrays', () => {
    const result = buildSystemPrompt({ ...base, toneTraits: [], contentTopics: [], services: [] })
    expect(result).toContain('competitor.com')
  })
})

// ── buildUserPrompt ────────────────────────────────────────────────────────

describe('buildUserPrompt', () => {
  const base = {
    articleContext: 'AI is reshaping enterprise software.',
    format: 'linkedin',
    tone: 'authoritative',
  }

  it('includes the article context', () => {
    expect(buildUserPrompt(base)).toContain('AI is reshaping enterprise software.')
  })

  it('includes the format', () => {
    expect(buildUserPrompt(base)).toContain('linkedin')
  })

  it('includes the tone', () => {
    expect(buildUserPrompt(base)).toContain('authoritative')
  })

  it('includes linkedin format instructions', () => {
    expect(buildUserPrompt(base)).toContain('1200')
  })

  it('includes twitter format instructions', () => {
    const result = buildUserPrompt({ ...base, format: 'twitter' })
    expect(result).toContain('280')
  })

  it('includes instagram format instructions', () => {
    const result = buildUserPrompt({ ...base, format: 'instagram' })
    expect(result).toContain('hashtags')
  })
})
