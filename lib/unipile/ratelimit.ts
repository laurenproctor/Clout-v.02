import { createServiceClient } from '@/lib/supabase/service'

// Rate limits for the LinkedIn beta connector. Conservative by design — the goal is
// to protect the customer account, the provider relationship, and the product from
// looking like automation. Limits are enforced as count-over-window queries against
// the audit tables rather than a token bucket, so they survive across serverless
// instances with no shared in-memory state.

export const UNIPILE_LIMITS = {
  // Per-workspace LinkedIn search/monitor runs.
  searchPerWorkspace: { max: 30, windowMs: 60 * 60 * 1000 }, // 30 / hour
  // Per-connected-account outbound comments/reactions.
  engagementPerAccount: { max: 20, windowMs: 24 * 60 * 60 * 1000 }, // 20 / day
  // Max items ingested per single monitor run (caps blast radius of one fetch).
  maxItemsPerRun: 25,
  // Cooldown after a failed / restricted / suspicious provider response, per account.
  cooldownAfterFailureMs: 15 * 60 * 1000, // 15 min
} as const

export interface RateWindow {
  max: number
  windowMs: number
}

// Pure: is a given count within the allowed window? (count BEFORE the new action)
export function isWithinLimit(currentCount: number, window: RateWindow): boolean {
  return currentCount < window.max
}

// Pure: ISO timestamp for the start of the window ending at `now`.
export function windowStartIso(window: RateWindow, now: number = Date.now()): string {
  return new Date(now - window.windowMs).toISOString()
}

// ── DB-backed counts (wired into call sites in Phases 3–4) ──────────────────

// Outbound engagement actions for a channel within the engagement window.
// Counts everything past draft (i.e. actually attempted/posted), not abandoned drafts.
export async function countEngagementActionsForChannel(
  channelId: string,
  now: number = Date.now(),
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { count } = await supabase
    .from('linkedin_engagement_actions')
    .select('id', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .in('status', ['posting', 'posted', 'failed'])
    .gte('created_at', windowStartIso(UNIPILE_LIMITS.engagementPerAccount, now))
  return count ?? 0
}

// Has this conversation item already had a comment posted (or in flight)?
// Enforces the one-posted-comment-per-opportunity rule.
export async function hasPostedCommentForItem(conversationItemId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { count } = await supabase
    .from('linkedin_engagement_actions')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_item_id', conversationItemId)
    .eq('action_type', 'comment')
    .in('status', ['posting', 'posted'])
  return (count ?? 0) > 0
}
