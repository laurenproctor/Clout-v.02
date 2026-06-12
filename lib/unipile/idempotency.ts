import { createHash } from 'crypto'

// Deterministic idempotency key for a provider-posted engagement action.
// Same (workspace, target post, action, approved text) → same key, so retries,
// double-clicks, and job replays collapse onto one row (enforced by the unique
// index on linkedin_engagement_actions.idempotency_key).
//
// `approvedText` is included so an edited-and-re-approved comment is a distinct
// action rather than being silently deduped against the earlier draft.
export function engagementIdempotencyKey(params: {
  workspaceId: string
  providerSocialId: string
  actionType: 'comment' | 'reaction'
  approvedText?: string | null
}): string {
  const data = [
    params.workspaceId,
    params.providerSocialId,
    params.actionType,
    params.approvedText ?? '',
  ].join(':')
  return createHash('sha256').update(data).digest('hex').slice(0, 32)
}
