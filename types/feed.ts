// ============================================================
// GDELT Signal Feed — TypeScript Types
// ============================================================

export type FeedTab = 'news' | 'services' | 'concepts' | 'competitors'

export type DraftFormat = 'linkedin' | 'twitter' | 'blog' | 'newsletter' | 'instagram'

export type DraftTone = 'authoritative' | 'conversational' | 'provocative' | 'educational'

export type TonePreference = 'authoritative' | 'conversational' | 'provocative'

export type TimingClassification = 'evergreen' | 'publish_now'

export type CardTone = 'positive' | 'negative' | 'neutral'

export type OpportunityTier = 1 | 2 | 3

export type FeedPhase = 'onboarding' | 'generating' | 'feed'

export interface OnboardingDraft {
  content_topics: string[]
  services: string[]
  competitors: string[]
  editorial_voices: string[]
}

// Signal card — @transitional presentation/rendering layer
// Do not add canonical intelligence fields here. Use signals/signal_entities instead.
export interface SignalCard {
  id: string
  signal_id: string | null
  tab: FeedTab
  title: string
  tone: CardTone
  momentum_pct: string | null
  momentum_bar_width: number           // 0–100
  tags: string[]
  gdelt_score: number | null
  gdelt_score_label: string
  is_trending: boolean
  concept_surfaced_via: string | null  // Concepts tab only
  why_now: string | null               // Concepts tab only
  matched_service: string | null       // Services tab only
  timing_classification: TimingClassification | null
  competitor_id: string | null
  created_at: string
  refreshed_at: string
  // Added by GET /api/feed query at runtime — not stored
  opportunity_tier?: OpportunityTier
  ranking_rationale?: string[]
}

export interface CompetitorCard {
  id: string
  competitor_name: string
  competitor_handle: string
  headline: string
  date: string
  has_coverage: boolean
  momentum_text: string
  momentum_flat: boolean
  differentiated_angle: string
}

export interface UserProfile {
  id: string
  brand_name: string
  niche: string
  services: string[]
  tone_preference: TonePreference
  competitors: Array<{ name: string; handle: string; url: string }>
  content_topics: string[]
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface DraftRequest {
  card_id: string
  format: DraftFormat
  tone: DraftTone
  user_id: string
}

export interface DraftResponse {
  draft: string
}

export interface OnboardingPayload {
  brand_name: string
  niche: string
  services: string[]
  tone_preference: TonePreference
  competitors: Array<{ name: string; handle: string; url: string }>
  content_topics: string[]
}

// Canonical signal layer
export interface Signal {
  id: string
  external_id: string | null
  source: 'gdelt' | 'curated' | 'manual'
  title: string
  summary: string | null
  source_url: string | null
  published_at: string | null
  tone: CardTone
  gdelt_raw_score: number | null
  coverage_48h_pct: number | null
  first_seen_at: string
  refreshed_at: string | null
  created_at: string
}

export interface SignalEntity {
  id: string
  signal_id: string
  entity_name: string
  entity_type: 'person' | 'org' | 'location' | 'concept' | 'product' | 'theme'
  entity_role: 'primary' | 'secondary' | 'mentioned'
  confidence: number
}

export type SignalRelationshipType = 'co_occurs' | 'adjacent' | 'precedes'

export interface SignalRelationship {
  id: string
  entity_a: string
  entity_b: string
  relationship: SignalRelationshipType
  signal_count: number
  strength: number
  first_seen: string
  last_seen: string
}

export interface CompetitorEntity {
  id: string
  workspace_id: string
  name: string
  handle: string | null
  domain: string | null
  gdelt_entity_id: string | null
  platforms: string[]
  added_at: string
}

export type UserSignalInteractionType =
  | 'viewed'
  | 'dismissed'
  | 'draft_started'
  | 'draft_copied'
  | 'draft_edited'
  | 'published'
  | 'engagement_reported'
  | 'repost_detected'
  | 'inbound_attributed'

export interface UserSignalInteraction {
  id: string
  user_id: string
  signal_card_id: string
  interaction_type: UserSignalInteractionType
  interaction_data: Record<string, unknown>
  created_at: string
}

export interface FeedStats {
  totalSignals: number
  domainsTracked: number
  emergingFrameworks: number
  lastRefreshed: string | null
}

// Concept cluster (near-term; schema exists, ingestion pipeline populates)
export type ConceptClusterStatus = 'emerging' | 'rising' | 'peaking' | 'declining'

export interface ConceptCluster {
  id: string
  cluster_name: string
  description: string | null
  entity_identifiers: string[]
  status: ConceptClusterStatus
  whitespace_score: number | null
  coverage_velocity: number | null
  first_emerged_at: string | null
  peak_estimated_at: string | null
  updated_at: string
}
