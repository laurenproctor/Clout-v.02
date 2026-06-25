import { searchPosts } from '@/lib/unipile/client'

// Read-only capability surface for LinkedIn monitoring. The Phase-3 provider depends on
// THIS interface — not the full Unipile client module — so it is a *compile-time* error
// for the monitoring path to reach any outbound mutation helper. This is the actual
// guardrail; the token-scan tests are only a tripwire.
//
// The Unipile client is a module of exported functions (no class/interface), so we type
// the surface via `typeof`. Expose `searchPosts` ONLY — no list/post/mutation helpers.
export interface LinkedInMonitoringClient {
  searchPosts: typeof searchPosts
}

export const linkedinMonitoringClient: LinkedInMonitoringClient = { searchPosts }
