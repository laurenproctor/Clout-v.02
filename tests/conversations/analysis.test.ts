import { describe, it, expect } from 'vitest'
import { parseAnalysisResult, computeTimelinessScore } from '@/lib/conversations/analysis'

describe('computeTimelinessScore', () => {
  it('returns 100 for today', () => {
    expect(computeTimelinessScore(new Date().toISOString())).toBe(100)
  })
  it('returns ~50 for 10 days ago', () => {
    const d = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const score = computeTimelinessScore(d)
    expect(score).toBeGreaterThan(30)
    expect(score).toBeLessThan(80)
  })
  it('returns 0 for 31+ days ago', () => {
    const d = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    expect(computeTimelinessScore(d)).toBe(0)
  })
  it('returns 60 for null (unknown date)', () => {
    expect(computeTimelinessScore(null)).toBe(60)
  })
})

describe('parseAnalysisResult', () => {
  it('parses valid JSON', () => {
    const raw = JSON.stringify({
      relevanceScore: 80, uniquenessScore: 70,
      opportunities: [{ opportunityType: 'comment', title: 'Add pricing perspective', explanation: 'Your SaaS background is directly applicable.', whyThisMatters: null, opportunityScore: 85 }],
    })
    const r = parseAnalysisResult(raw)
    expect(r.relevanceScore).toBe(80)
    expect(r.uniquenessScore).toBe(70)
    expect(r.opportunities).toHaveLength(1)
    expect(r.opportunities[0].opportunityType).toBe('comment')
  })
  it('returns zeros on malformed input', () => {
    const r = parseAnalysisResult('not json')
    expect(r.relevanceScore).toBe(0)
    expect(r.opportunities).toHaveLength(0)
  })
  it('clamps scores to 0-100', () => {
    const raw = JSON.stringify({ relevanceScore: 200, uniquenessScore: -10, opportunities: [] })
    const r = parseAnalysisResult(raw)
    expect(r.relevanceScore).toBe(100)
    expect(r.uniquenessScore).toBe(0)
  })
  it('filters invalid opportunity types', () => {
    const raw = JSON.stringify({
      relevanceScore: 70, uniquenessScore: 70,
      opportunities: [{ opportunityType: 'spam', title: 'x', explanation: 'y', opportunityScore: 50 }],
    })
    expect(parseAnalysisResult(raw).opportunities).toHaveLength(0)
  })
})
