// Substack audit events. Matches the publishing layer's existing structured-logging
// convention (see lib/publishing/executor.ts: `console.log(JSON.stringify({ event, ... }))`)
// rather than introducing a new table/enum. Every meaningful + blocked Substack action
// is recorded here so Clout can always explain what happened — especially for
// subscriber-facing actions.
//
// SAFETY: this helper NEVER accepts or emits encrypted sessions, passwords, cookies,
// tokens, or raw credentials. Only the whitelisted fields below are logged.

export type SubstackAuditEvent =
  | 'substack_draft_created'
  | 'substack_direct_publish_blocked'
  | 'substack_publish_on_substack_requested'
  | 'substack_email_subscribers_requested'
  | 'substack_manual_fallback_opened'
  | 'substack_session_renewal_failed'
  | 'substack_unexpected_response_shape'
  | 'substack_missing_provider_url'
  | 'substack_connection_marked_unhealthy'

export interface SubstackAuditFields {
  workspaceId?: string | null
  outputId?: string | null
  publishingConnectionId?: string | null
  intendedAction?: string | null
  status?: string | null
  userId?: string | null
  publicationName?: string | null
  reason?: string | null
}

// Whitelisted fields only — guarantees no credential material is ever logged.
export function recordSubstackAudit(event: SubstackAuditEvent, fields: SubstackAuditFields): void {
  console.log(JSON.stringify({
    event,
    provider:                 'substack',
    workspace_id:             fields.workspaceId ?? null,
    output_id:                fields.outputId ?? null,
    publishing_connection_id: fields.publishingConnectionId ?? null,
    intended_action:          fields.intendedAction ?? null,
    status:                   fields.status ?? null,
    user_id:                  fields.userId ?? null,
    publication_name:         fields.publicationName ?? null,
    reason:                   fields.reason ?? null,
  }))
}
