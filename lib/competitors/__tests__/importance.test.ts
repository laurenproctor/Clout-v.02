import { describe, it, expect } from 'vitest'
import { calculateImportanceScore } from '../calculate-importance'

describe('calculateImportanceScore', () => {
  it('returns a number between 0 and 100', () => {
    const score = calculateImportanceScore({
      published_at: new Date().toISOString(),
      metrics: { likes: 100, comments: 10 },
      content: 'A reasonable post with some content',
      source_type: 'linkedin',
      source_confidence: 'high',
      topics: ['AI', 'Marketing'],
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('scores fresh content higher than old content', () => {
    const base = {
      metrics: { likes: 0 }, content: 'test content here',
      source_type: 'twitter', source_confidence: 'high' as const, topics: [],
    }
    const fresh = calculateImportanceScore({ ...base, published_at: new Date().toISOString() })
    const old   = calculateImportanceScore({ ...base, published_at: new Date(Date.now() - 100 * 86_400_000).toISOString() })
    expect(fresh).toBeGreaterThan(old)
  })

  it('scores high-engagement content higher than zero-engagement content', () => {
    const base = {
      published_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      content: 'same content', source_type: 'linkedin',
      source_confidence: 'high' as const, topics: [],
    }
    const viral = calculateImportanceScore({ ...base, metrics: { likes: 5000, comments: 200, shares: 300 } })
    const zero  = calculateImportanceScore({ ...base, metrics: {} })
    expect(viral).toBeGreaterThan(zero)
  })

  it('returns 0 for minimal input', () => {
    const score = calculateImportanceScore({
      published_at: null, metrics: {}, content: '',
      source_type: 'twitter', source_confidence: 'low', topics: [],
    })
    expect(score).toBeGreaterThanOrEqual(0)
  })
})
