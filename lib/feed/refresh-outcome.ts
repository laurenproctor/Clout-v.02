import type { FeedIngestSummary } from './ingest'

// Business outcome of a completed refresh run, separate from transport status.
// "Changes" only ever means newly-inserted cards — re-touching existing rows is
// housekeeping, not a user-visible signal.
export type RefreshOutcome =
  | 'new_cards'
  | 'partial_new_cards'
  | 'existing_only'
  | 'partial_existing_only'
  | 'no_results'
  | 'provider_failed'

/**
 * Classify a completed ingestion summary into a single business outcome.
 * Pure + dependency-free so the (riskiest) classification logic is unit-testable
 * without the route's auth/DB stack.
 */
export function deriveRefreshOutcome(summary: FeedIngestSummary): RefreshOutcome {
  const hasErr = summary.topicsFailed > 0
  if (summary.newCards > 0) {
    return hasErr ? 'partial_new_cards' : 'new_cards'
  }
  if (summary.existingCardsRefreshed > 0) {
    return hasErr ? 'partial_existing_only' : 'existing_only'
  }
  if (hasErr) return 'provider_failed'
  return 'no_results'
}

// Navigate to the feed only when there are genuinely new cards to show.
export function shouldNavigateToFeed(outcome: RefreshOutcome): boolean {
  return outcome === 'new_cards' || outcome === 'partial_new_cards'
}
