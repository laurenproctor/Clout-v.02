import { describe, it, expect } from 'vitest'
import { deriveRefreshOutcome, shouldNavigateToFeed } from '@/lib/feed/refresh-outcome'
import type { FeedIngestSummary, FeedIngestError } from '@/lib/feed/ingest'

function summary(overrides: Partial<FeedIngestSummary> = {}): FeedIngestSummary {
  return {
    topicsProcessed: 1,
    topicsSucceeded: 1,
    topicsFailed: 0,
    articlesReturned: 0,
    articlesAccepted: 0,
    newCards: 0,
    existingCardsRefreshed: 0,
    errors: [],
    provider: { name: 'newsdata', status: 'ok' },
    durationMs: 1,
    ...overrides,
  }
}

const err = (code: FeedIngestError['code']): FeedIngestError => ({
  topic: 't',
  provider: 'newsdata',
  code,
  retryable: code === 'rate_limited' || code === 'timeout',
})

describe('deriveRefreshOutcome', () => {
  it('new cards, no errors → new_cards (navigate)', () => {
    const o = deriveRefreshOutcome(summary({ newCards: 5, articlesReturned: 5, articlesAccepted: 5 }))
    expect(o).toBe('new_cards')
    expect(shouldNavigateToFeed(o)).toBe(true)
  })

  it('new cards, some errors → partial_new_cards (navigate)', () => {
    const o = deriveRefreshOutcome(
      summary({ newCards: 3, topicsFailed: 1, topicsProcessed: 2, topicsSucceeded: 1, errors: [err('rate_limited')] }),
    )
    expect(o).toBe('partial_new_cards')
    expect(shouldNavigateToFeed(o)).toBe(true)
  })

  it('existing only, no errors → existing_only (no navigate)', () => {
    const o = deriveRefreshOutcome(summary({ existingCardsRefreshed: 4, articlesReturned: 4, articlesAccepted: 4 }))
    expect(o).toBe('existing_only')
    expect(shouldNavigateToFeed(o)).toBe(false)
  })

  it('existing only, some errors → partial_existing_only (no navigate)', () => {
    const o = deriveRefreshOutcome(
      summary({ existingCardsRefreshed: 2, topicsFailed: 1, topicsProcessed: 2, topicsSucceeded: 1, errors: [err('http_error')] }),
    )
    expect(o).toBe('partial_existing_only')
    expect(shouldNavigateToFeed(o)).toBe(false)
  })

  it('zero articles, no errors → no_results (no navigate)', () => {
    const o = deriveRefreshOutcome(summary({ articlesReturned: 0 }))
    expect(o).toBe('no_results')
    expect(shouldNavigateToFeed(o)).toBe(false)
  })

  it('all topics rate-limited (no cards) → provider_failed', () => {
    const o = deriveRefreshOutcome(
      summary({ topicsProcessed: 2, topicsSucceeded: 0, topicsFailed: 2, errors: [err('rate_limited'), err('rate_limited')] }),
    )
    expect(o).toBe('provider_failed')
    expect(shouldNavigateToFeed(o)).toBe(false)
  })

  it('missing API key (no cards) → provider_failed', () => {
    const o = deriveRefreshOutcome(
      summary({ topicsProcessed: 2, topicsSucceeded: 0, topicsFailed: 2, errors: [err('missing_api_key'), err('missing_api_key')] }),
    )
    expect(o).toBe('provider_failed')
    expect(shouldNavigateToFeed(o)).toBe(false)
  })

  it('new cards take precedence over existing refreshes', () => {
    const o = deriveRefreshOutcome(summary({ newCards: 1, existingCardsRefreshed: 9 }))
    expect(o).toBe('new_cards')
  })
})
