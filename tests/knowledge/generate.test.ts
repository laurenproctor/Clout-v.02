import { describe, it, expect } from 'vitest'
import {
  slugify,
  buildContextHash,
  isCacheFresh,
  hasEnoughContext,
  deduplicateTopics,
  parseGenerationResponse,
  buildUserMessage,
  type WorkspaceContext,
  type KnowledgeSignalsCache,
} from '@/lib/knowledge/generate'
import type { KnowledgeTopic } from '@/types/feed'

// ── slugify ────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Supply Chain Risk')).toBe('supply-chain-risk')
  })

  it('strips special characters', () => {
    expect(slugify('AI & Machine Learning')).toBe('ai-machine-learning')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('Trauma-Informed  Care')).toBe('trauma-informed-care')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })

  it('handles already-slugged strings', () => {
    expect(slugify('behavioral-health-design')).toBe('behavioral-health-design')
  })
})

// ── buildContextHash ───────────────────────────────────────────────────────

describe('buildContextHash', () => {
  const base: WorkspaceContext = {
    brand_name: 'Acme Corp',
    services: ['Consulting', 'Training'],
    content_topics: ['Leadership', 'Operations'],
    recent_titles: ['Post A', 'Post B'],
  }

  it('returns a 64-character hex string', () => {
    const hash = buildContextHash(base)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('same inputs produce the same hash', () => {
    expect(buildContextHash(base)).toBe(buildContextHash(base))
  })

  it('different brand_name produces different hash', () => {
    expect(buildContextHash({ ...base, brand_name: 'Other Co' })).not.toBe(buildContextHash(base))
  })

  it('different recent_titles produces different hash', () => {
    expect(buildContextHash({ ...base, recent_titles: ['New Post'] })).not.toBe(buildContextHash(base))
  })

  it('services order does not affect hash', () => {
    const reordered = { ...base, services: ['Training', 'Consulting'] }
    expect(buildContextHash(reordered)).toBe(buildContextHash(base))
  })

  it('content_topics order does not affect hash', () => {
    const reordered = { ...base, content_topics: ['Operations', 'Leadership'] }
    expect(buildContextHash(reordered)).toBe(buildContextHash(base))
  })
})

// ── isCacheFresh ───────────────────────────────────────────────────────────

describe('isCacheFresh', () => {
  const hash = 'abc123'

  const freshCache: KnowledgeSignalsCache = {
    industry_summary: 'Industry: Test',
    topics: [],
    generated_at: new Date().toISOString(),
    context_hash: hash,
  }

  it('returns true for a cache generated now with matching hash', () => {
    expect(isCacheFresh(freshCache, hash)).toBe(true)
  })

  it('returns false when context_hash differs', () => {
    expect(isCacheFresh(freshCache, 'different-hash')).toBe(false)
  })

  it('returns false when generated_at is more than 7 days ago', () => {
    const stale: KnowledgeSignalsCache = {
      ...freshCache,
      generated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(isCacheFresh(stale, hash)).toBe(false)
  })

  it('returns true when generated_at is exactly 6 days ago', () => {
    const slightlyOld: KnowledgeSignalsCache = {
      ...freshCache,
      generated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(isCacheFresh(slightlyOld, hash)).toBe(true)
  })
})

// ── hasEnoughContext ───────────────────────────────────────────────────────

describe('hasEnoughContext', () => {
  it('returns false when all fields are empty/sparse', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: [],
    })).toBe(false)
  })

  it('returns false when only brand_name is set (not enough signal)', () => {
    expect(hasEnoughContext({
      brand_name: 'Acme',
      services: [],
      content_topics: [],
      recent_titles: [],
    })).toBe(false)
  })

  it('returns true when services are present', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: ['Consulting'],
      content_topics: [],
      recent_titles: [],
    })).toBe(true)
  })

  it('returns true when content_topics are present', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: ['Leadership'],
      recent_titles: [],
    })).toBe(true)
  })

  it('returns true when recent_titles has 5 or more entries', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: ['A', 'B', 'C', 'D', 'E'],
    })).toBe(true)
  })

  it('returns false when recent_titles has fewer than 5 entries and no services/topics', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: ['A', 'B', 'C', 'D'],
    })).toBe(false)
  })

  it('returns true when recent_titles < 5 but services are present', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: ['Consulting'],
      content_topics: [],
      recent_titles: ['A', 'B', 'C', 'D'],
    })).toBe(true)
  })
})

// ── deduplicateTopics ──────────────────────────────────────────────────────

const makeTopic = (title: string): KnowledgeTopic => ({
  id: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  category: 'foundational',
  importance_score: 80,
  importance_level: 'important',
  status: 'core',
  summary: 'Test',
  frameworks: [],
  thinkers: [],
  debates: [],
  related_topics: [],
  recommended_reading: [],
  content_angles: ['Angle 1'],
})

describe('deduplicateTopics', () => {
  it('returns all topics when all are distinct', () => {
    const topics = [makeTopic('Topic A'), makeTopic('Topic B'), makeTopic('Topic C')]
    expect(deduplicateTopics(topics)).toHaveLength(3)
  })

  it('removes duplicate slugs', () => {
    const topics = [makeTopic('Topic A'), makeTopic('Topic A'), makeTopic('Topic B')]
    const result = deduplicateTopics(topics)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Topic A')
    expect(result[1].title).toBe('Topic B')
  })

  it('keeps the first occurrence of a duplicate', () => {
    const a1 = { ...makeTopic('Positioning'), importance_score: 90 }
    const a2 = { ...makeTopic('Positioning'), importance_score: 50 }
    const result = deduplicateTopics([a1, a2])
    expect(result[0].importance_score).toBe(90)
  })

  it('handles empty array', () => {
    expect(deduplicateTopics([])).toEqual([])
  })
})

// ── parseGenerationResponse ────────────────────────────────────────────────

describe('parseGenerationResponse', () => {
  const validTopic = {
    title: 'Supply Chain Risk',
    category: 'foundational',
    importance_score: 85,
    importance_level: 'important',
    status: 'core',
    summary: 'How companies manage disruptions.',
    frameworks: ['SCRM'],
    thinkers: [],
    debates: [],
    related_topics: [],
    recommended_reading: [],
    content_angles: ['Guide: What is supply chain risk?'],
  }

  const validResponse = JSON.stringify({
    industry_summary: 'Industry: Logistics\nSubdomains:\n- Supply Chain',
    topics: [validTopic],
  })

  it('parses a valid response', () => {
    const result = parseGenerationResponse(validResponse)
    expect(result).not.toBeNull()
    expect(result!.topics).toHaveLength(1)
    expect(result!.industry_summary).toContain('Logistics')
  })

  it('returns null for empty string', () => {
    expect(parseGenerationResponse('')).toBeNull()
  })

  it('returns null when topics array is missing', () => {
    expect(parseGenerationResponse(JSON.stringify({ industry_summary: 'Industry: X' }))).toBeNull()
  })

  it('filters out topics missing required fields', () => {
    const bad = { title: 'Missing fields' } // no category, summary, content_angles
    const response = JSON.stringify({
      industry_summary: 'Industry: X',
      topics: [bad, validTopic],
    })
    const result = parseGenerationResponse(response)
    expect(result!.topics).toHaveLength(1)
    expect(result!.topics[0].title).toBe('Supply Chain Risk')
  })

  it('returns null when all topics fail validation', () => {
    const response = JSON.stringify({
      industry_summary: 'Industry: X',
      topics: [{ title: 'Bad' }],
    })
    expect(parseGenerationResponse(response)).toBeNull()
  })

  it('handles JSON wrapped in markdown fences', () => {
    const fenced = '```json\n' + validResponse + '\n```'
    const result = parseGenerationResponse(fenced)
    expect(result).not.toBeNull()
    expect(result!.topics).toHaveLength(1)
  })
})

// ── buildUserMessage ───────────────────────────────────────────────────────

describe('buildUserMessage', () => {
  it('includes brand_name when set', () => {
    const msg = buildUserMessage({
      brand_name: 'Acme',
      services: [],
      content_topics: [],
      recent_titles: [],
    })
    expect(msg).toContain('Acme')
  })

  it('includes services when present', () => {
    const msg = buildUserMessage({
      brand_name: '',
      services: ['Hazardous Waste Management'],
      content_topics: [],
      recent_titles: [],
    })
    expect(msg).toContain('Hazardous Waste Management')
  })

  it('includes recent titles with numbering', () => {
    const msg = buildUserMessage({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: ['Post One', 'Post Two'],
    })
    expect(msg).toContain('1. Post One')
    expect(msg).toContain('2. Post Two')
  })

  it('omits empty sections', () => {
    const msg = buildUserMessage({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: [],
    })
    expect(msg.trim()).toBe('')
  })
})
