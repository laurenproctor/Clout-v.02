// ============================================================
// GDELT Signal Feed — TypeScript Types
// ============================================================

export type FeedTab = 'news' | 'website' | 'concepts' | 'competitors' | 'knowledge'
// 'concepts' retained for DB backward compat — no longer shown in nav

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
  // Denormalized from signals at read time by GET /api/feed
  source_url: string | null
  published_at: string | null
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

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram' | 'youtube' | 'facebook'

export interface CompetitorSocials {
  twitter?: string
  linkedin?: string
  instagram?: string
  youtube?: string
  facebook?: string
}

export type CompetitorMetadata = Record<string, {
  name?: string
  rss_url?: string
  socials?: CompetitorSocials
}>

export interface CompetitorPost {
  id: string
  brand_domain: string
  brand_name: string
  property: 'blog' | 'youtube'
  property_label: string
  title: string
  excerpt: string
  published_at: string
  url: string
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

// ============================================================
// Website Intelligence — data model
// ============================================================

export interface WebsiteAsset {
  id: string
  type: 'homepage' | 'service' | 'product' | 'case_study' | 'testimonial'
       | 'report' | 'blog' | 'resource' | 'about'
  title: string
  url: string
  services: string[]
  extracted_quotes: string[]
  extracted_statistics: string[]
  extracted_proof_points: string[]
  last_promoted_at?: string
  published_at?: string
  updated_at?: string
}

export interface OpportunityReason {
  type: 'never_promoted' | 'contains_statistics' | 'contains_testimonials'
       | 'service_alignment' | 'high_momentum' | 'evergreen_content' | 'trend_match'
  score: number
  explanation: string
}

export interface OpportunityScoreBreakdown {
  business_alignment: number
  proof_strength: number
  content_potential: number
  momentum: number
  freshness: number
  confidence_contribution: number
}

export interface TopicCluster {
  id: string
  name: string
  assets: string[]
  services: string[]
  opportunity_score: number
}

export interface WebsiteOpportunity {
  id: string
  asset_id: string
  title: string
  score: number
  confidence: number
  score_breakdown?: OpportunityScoreBreakdown
  status: 'new' | 'generated' | 'published' | 'dismissed'
  level: 'high' | 'medium' | 'emerging'
  category: 'promotion' | 'repurpose' | 'gap' | 'trend_match' | 'thought_leadership'
  momentum?: string
  tags: string[]
  matched_service: string
  source_type: string
  source_url?: string
  why_this_matters: string
  reasons: OpportunityReason[]
  formats: string[]
  trend_signal_title?: string
  trend_asset_count?: Record<string, number>
}

export interface WebsiteContentGap {
  id: string
  headline: string
  detail: string
  opportunity: string
  matched_service: string
  tags: string[]
}

// ============================================================
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

// ============================================================
// Knowledge Signals — data model
// ============================================================

export interface KnowledgeResource {
  title: string
  author: string
  type: 'book' | 'article' | 'research' | 'podcast' | 'video'
  url?: string
}

export interface KnowledgeTopic {
  id: string
  title: string
  category: 'foundational' | 'advanced' | 'emerging' | 'debate' | 'thinker'
  importance_score: number
  importance_level: 'essential' | 'important' | 'specialized' | 'emerging'
  status: 'core' | 'trending' | 'controversial' | 'emerging'
  summary: string
  frameworks: string[]
  thinkers: string[]
  debates: string[]
  related_topics: string[]
  recommended_reading: KnowledgeResource[]
  content_angles: string[]
  trend_connections?: string[]
  related_signal_topics?: string[]
  frequently_confused_with?: string[]
  debate_for?: string[]
  debate_against?: string[]
}

export interface KnowledgeRelationship {
  source_topic_id: string
  target_topic_id: string
  relationship: 'depends_on' | 'related_to' | 'opposes' | 'extends'
}
