export const FEATURES = {
  substackPublishing: process.env.SUBSTACK_PUBLISHING_ENABLED === 'true',
  // Master switch for direct (non-draft) Substack publishing. When false, every
  // direct-publish branch fails closed to the manual fallback regardless of the
  // per-capability constants below.
  substackDirectPublish: process.env.SUBSTACK_DIRECT_PUBLISH_ENABLED === 'true',
  // Master switch for the LinkedIn beta connector (Unipile). When false, no Unipile
  // route or client method may run, regardless of per-workspace beta settings.
  linkedinUnipileEnabled: process.env.LINKEDIN_UNIPILE_ENABLED === 'true',
}

// Per-capability gates for Substack's undocumented internal endpoints. A constant
// may only flip to `true` after the matching section of docs/research/substack-api.md
// is captured with live request/response examples and reviewed. The markdown doc is a
// review artifact and is NEVER read at runtime — these constants are the runtime gate.
// Direct-publish execution requires FEATURES.substackDirectPublish === true AND the
// matching capability here.
export const SUBSTACK_CAPABILITIES = {
  newsletterDraft:      true,   // verified: provider creates drafts today
  notesPublish:         false,  // unverified — see docs/research/substack-api.md#notes-publishing
  newsletterPublishWeb: false,  // unverified — see docs/research/substack-api.md#web-publish
  newsletterSendEmail:  false,  // unverified — see docs/research/substack-api.md#email--send-behavior
} as const

export type SubstackCapability = keyof typeof SUBSTACK_CAPABILITIES

// Maps a Substack intended_action to the capability flag that gates it. Draft creation
// is gated by `newsletterDraft` (verified). Returns null for non-gated/unknown actions.
export function substackCapabilityForAction(
  intendedAction: string,
): SubstackCapability | null {
  switch (intendedAction) {
    case 'substack_newsletter_draft':       return 'newsletterDraft'
    case 'substack_note_publish':           return 'notesPublish'
    case 'substack_newsletter_publish_web': return 'newsletterPublishWeb'
    case 'substack_newsletter_send_email':  return 'newsletterSendEmail'
    default:                                 return null
  }
}

// Single source of truth for "may this Substack action call a live endpoint right now?"
// Draft creation only needs substackPublishing; direct actions need substackDirectPublish
// AND their capability flag.
export function isSubstackActionEnabled(intendedAction: string): boolean {
  const capability = substackCapabilityForAction(intendedAction)
  if (!capability) return false
  if (capability === 'newsletterDraft') {
    return FEATURES.substackPublishing && SUBSTACK_CAPABILITIES.newsletterDraft
  }
  return (
    FEATURES.substackPublishing &&
    FEATURES.substackDirectPublish &&
    SUBSTACK_CAPABILITIES[capability]
  )
}
