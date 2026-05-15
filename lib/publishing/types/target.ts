import { createHash } from 'crypto'
import type { PublishingProviderId } from './index'

// ─── Known target type values ─────────────────────────────────────────────────
// Open string type — flexibility allows future extension (newsletters, communities,
// channels, spaces, collections, sections, hubs).
// Known values live here as constants. normalizeTargetType() prevents taxonomy drift.

export const KNOWN_TARGET_TYPES = {
  publication:  'publication',
  site:         'site',
  blog:         'blog',
  organization: 'organization',
  profile:      'profile',
} as const

export type KnownTargetType = (typeof KNOWN_TARGET_TYPES)[keyof typeof KNOWN_TARGET_TYPES]

export const TARGET_CATEGORIES = {
  owned:        'owned',        // publication, site, blog — user controls content
  distribution: 'distribution', // organization, channel, page
  community:    'community',    // newsletter, group, space
} as const

export type TargetCategory = (typeof TARGET_CATEGORIES)[keyof typeof TARGET_CATEGORIES]

// ─── PublishingTarget ─────────────────────────────────────────────────────────
// Generalized publish destination — Medium publications, LinkedIn organizations,
// Shopify blogs, WordPress sites are all the same concept.

export interface PublishingTarget {
  id:             string                 // deterministic — see buildTargetId()
  provider:       PublishingProviderId
  externalId:     string                 // provider's opaque identifier
  label:          string                 // human-readable: "The Startup", "Company Blog"
  type:           string                 // use KNOWN_TARGET_TYPES constants for known values
  targetCategory: TargetCategory
  url?:           string
  metadata?:      Record<string, unknown>
}

// ─── Deterministic ID ────────────────────────────────────────────────────────
// Stable across reconnects, token refreshes, publication refetches,
// account migrations, analytics attribution, and cached selections.
// crypto.randomUUID() must NOT be used for PublishingTarget IDs.

export function buildTargetId(provider: string, externalId: string): string {
  return createHash('sha256').update(`${provider}:${externalId}`).digest('hex').slice(0, 24)
}

// ─── Type canonicalization ────────────────────────────────────────────────────
// Prevents taxonomy drift: 'publication' / 'Publication' / 'pub' all → 'publication'

const TYPE_ALIASES: Record<string, string> = {
  publication: KNOWN_TARGET_TYPES.publication,
  pub:         KNOWN_TARGET_TYPES.publication,
  website:     KNOWN_TARGET_TYPES.site,
  org:         KNOWN_TARGET_TYPES.organization,
  company:     KNOWN_TARGET_TYPES.organization,
  page:        KNOWN_TARGET_TYPES.organization,
}

export function normalizeTargetType(raw: string): string {
  const lower = raw.toLowerCase().trim()
  return TYPE_ALIASES[lower] ?? lower
}
