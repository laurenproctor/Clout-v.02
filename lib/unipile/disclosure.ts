// Canonical disclosure constants for the LinkedIn beta connector (Unipile).
// Mirrors docs/linkedin-connector-disclosure.md — keep both in sync.
// Bump DISCLOSURE_VERSION when the risk model materially changes; users who accepted
// an older version must re-accept before any further connector activity.

export const DISCLOSURE_VERSION = '2026-06-12.1'

export const DISCLOSURE_TEXT =
  "This LinkedIn beta connector uses a third-party provider that is not LinkedIn's official API " +
  'for certain monitoring and engagement workflows. LinkedIn may restrict accounts that use ' +
  'unsupported automation, scraping, or session-based third-party access. Clout requires human ' +
  'approval for every outbound action and does not silently automate comments, reactions, or posting.'
