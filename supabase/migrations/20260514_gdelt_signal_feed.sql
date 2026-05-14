-- ============================================================
-- GDELT Signal Feed — Phase 2 Architecture
-- Run in Supabase SQL editor. Some ALTER TYPE statements
-- must run outside a transaction block if the DB already has rows.
-- ============================================================

-- ============================================================
-- ENUMS (feed-specific)
-- ============================================================

CREATE TYPE tone_pref AS ENUM ('authoritative', 'conversational', 'provocative');
CREATE TYPE feed_tab AS ENUM ('news', 'services', 'concepts', 'competitors');
CREATE TYPE tone_val AS ENUM ('positive', 'negative', 'neutral');
CREATE TYPE timing_class AS ENUM ('evergreen', 'publish_now');
CREATE TYPE draft_format AS ENUM ('linkedin', 'twitter', 'blog', 'newsletter', 'instagram');
CREATE TYPE draft_tone AS ENUM ('authoritative', 'conversational', 'provocative', 'educational');

-- ============================================================
-- CANONICAL SIGNAL LAYER
-- Authoritative intelligence object. User-agnostic.
-- signal_cards is a derived presentation/rendering layer built on top of this.
-- @transitional: signal_cards will eventually reference signals exclusively.
-- ============================================================

CREATE TABLE signals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id      text,                         -- GDELT article/event ID
  source           text NOT NULL DEFAULT 'gdelt', -- 'gdelt' | 'curated' | 'manual'
  title            text NOT NULL,
  summary          text,
  source_url       text,
  published_at     timestamptz,
  tone             tone_val NOT NULL DEFAULT 'neutral',
  gdelt_raw_score  decimal(4,2),
  coverage_48h_pct decimal(8,2),                 -- % coverage change 48h; drives momentum
  first_seen_at    timestamptz DEFAULT now(),
  refreshed_at     timestamptz,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX signals_gdelt_score_idx ON signals(gdelt_raw_score DESC NULLS LAST);
CREATE INDEX signals_first_seen_idx ON signals(first_seen_at DESC);

-- ============================================================
-- PRESENTATION/RENDERING LAYER
-- @transitional: derived from signals. Do NOT add canonical intelligence here.
-- Eventual rename: feed_cards | feed_entries | signal_presentations
-- ============================================================

-- @transitional signal_cards schema (spec §2)
CREATE TABLE signal_cards (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id              uuid REFERENCES signals(id),  -- nullable; backfilled as signals populate
  tab                    feed_tab NOT NULL,
  title                  text NOT NULL,
  tone                   tone_val NOT NULL,
  momentum_pct           text,
  momentum_bar_width     integer CHECK (momentum_bar_width BETWEEN 0 AND 100),
  tags                   text[],                        -- display-only; canonical entities in signal_entities
  gdelt_score            decimal(4,2),
  gdelt_score_label      text,
  is_trending            boolean DEFAULT false,
  concept_surfaced_via   text,                          -- Concepts tab only
  why_now                text,                          -- Concepts tab only
  matched_service        text,                          -- Services tab only (remove in v2; compute at query time)
  timing_classification  timing_class,
  competitor_id          uuid,                          -- Competitors tab only
  created_at             timestamptz DEFAULT now(),
  refreshed_at           timestamptz
);

CREATE INDEX signal_cards_tab_idx ON signal_cards(tab);
CREATE INDEX signal_cards_signal_id_idx ON signal_cards(signal_id);
CREATE INDEX signal_cards_gdelt_score_idx ON signal_cards(gdelt_score DESC NULLS LAST);

-- ============================================================
-- ENTITY GRAPH (lightweight — Phase 1: co_occurs, adjacent, precedes only)
-- Do not add more relationship types until graph density supports it.
-- ============================================================

CREATE TABLE signal_entities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   uuid REFERENCES signals(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  entity_type text NOT NULL,       -- 'person' | 'org' | 'location' | 'concept' | 'product' | 'theme'
  entity_role text DEFAULT 'mentioned', -- 'primary' | 'secondary' | 'mentioned'
  confidence  decimal(3,2) DEFAULT 1.0  -- 0–1; reserved for future ML scoring
);

CREATE INDEX se_signal_id_idx ON signal_entities(signal_id);
CREATE INDEX se_entity_name_idx ON signal_entities(entity_name);
CREATE INDEX se_entity_type_idx ON signal_entities(entity_type);

-- Lightweight entity co-occurrence graph.
-- Phase 1 relationship types: co_occurs | adjacent | precedes
-- Do not add richer semantics until graph density and behavioral evidence support it.
CREATE TABLE signal_relationships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a     text NOT NULL,
  entity_b     text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('co_occurs', 'adjacent', 'precedes')),
  signal_count integer DEFAULT 1,          -- # signals containing both entities
  strength     decimal(4,2) DEFAULT 1.0,   -- normalized co-occurrence strength
  first_seen   timestamptz DEFAULT now(),
  last_seen    timestamptz DEFAULT now(),
  UNIQUE(entity_a, entity_b, relationship)
);

CREATE INDEX sr_entity_a_idx ON signal_relationships(entity_a);
CREATE INDEX sr_entity_b_idx ON signal_relationships(entity_b);

-- ============================================================
-- USER PROFILES (feed-specific; separate from workspace profiles)
-- id references internal users table (Clerk-resolved UUID), not auth.users
-- ============================================================

CREATE TABLE user_profiles (
  id                  uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  brand_name          text NOT NULL,
  niche               text,
  services            text[],
  tone_preference     tone_pref NOT NULL DEFAULT 'authoritative',
  competitors         jsonb DEFAULT '[]',   -- legacy: use competitor_entities going forward
  content_topics      text[] DEFAULT '{}',
  onboarding_complete boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz
);

-- ============================================================
-- COMPETITOR INTELLIGENCE
-- Replaces jsonb blob in user_profiles.competitors
-- ============================================================

CREATE TABLE competitor_entities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  handle          text,
  domain          text,
  gdelt_entity_id text,
  platforms       text[] DEFAULT '{}',
  added_at        timestamptz DEFAULT now()
);

CREATE INDEX competitor_entities_workspace_idx ON competitor_entities(workspace_id);

-- ============================================================
-- BEHAVIORAL LEARNING (append-only; never update rows)
-- interaction_data is extensible jsonb — add fields without schema changes.
-- Phase 1 types: viewed | dismissed | draft_started | draft_copied | draft_edited | published
-- Future types (add to interaction_data): engagement_reported | repost_detected | inbound_attributed
-- ============================================================

CREATE TABLE user_signal_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE CASCADE,
  signal_card_id   uuid REFERENCES signal_cards(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  interaction_data jsonb DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX usi_user_id_idx ON user_signal_interactions(user_id);
CREATE INDEX usi_card_id_idx ON user_signal_interactions(signal_card_id);
CREATE INDEX usi_type_idx ON user_signal_interactions(interaction_type);
CREATE INDEX usi_created_idx ON user_signal_interactions(created_at DESC);

-- ============================================================
-- DRAFT CACHE (with provenance)
-- ============================================================

CREATE TABLE draft_cache (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id            uuid REFERENCES signal_cards(id) ON DELETE CASCADE,
  user_id            uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  format             draft_format NOT NULL,
  tone               draft_tone NOT NULL,
  content            text,
  model_id           text DEFAULT 'gpt-4o',
  prompt_version     text DEFAULT '1.0.0',
  system_prompt_hash text,
  generated_at       timestamptz DEFAULT now(),
  invalidated_at     timestamptz,
  UNIQUE(card_id, user_id, format, tone, prompt_version)
);

-- ============================================================
-- NEAR-TERM TABLES (schema defined now; ingestion pipeline populates later)
-- ============================================================

-- concept_clusters: semantic territory groupings (the Emerging Frameworks moat)
CREATE TABLE concept_clusters (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_name       text NOT NULL,
  description        text,
  entity_identifiers text[],            -- GDELT entity names
  status             text NOT NULL DEFAULT 'emerging',
  -- emerging | rising | peaking | declining
  whitespace_score   integer CHECK (whitespace_score BETWEEN 0 AND 100),
  coverage_velocity  decimal(6,2),
  first_emerged_at   timestamptz,
  peak_estimated_at  timestamptz,
  updated_at         timestamptz DEFAULT now()
);

CREATE TABLE concept_cluster_signals (
  cluster_id uuid REFERENCES concept_clusters(id) ON DELETE CASCADE,
  card_id    uuid REFERENCES signal_cards(id) ON DELETE CASCADE,
  weight     decimal(4,2) DEFAULT 1.0,
  PRIMARY KEY (cluster_id, card_id)
);

-- competitor_mentions: what each competitor is actually publishing
CREATE TABLE competitor_mentions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitor_entities(id) ON DELETE CASCADE,
  card_id       uuid REFERENCES signal_cards(id),
  signal_id     uuid REFERENCES signals(id),
  headline      text NOT NULL,
  published_at  timestamptz,
  platform      text,
  has_coverage  boolean DEFAULT false,
  tone          tone_val,
  angle_summary text,
  fetched_at    timestamptz DEFAULT now()
);

CREATE INDEX competitor_mentions_competitor_idx ON competitor_mentions(competitor_id);
CREATE INDEX competitor_mentions_signal_idx ON competitor_mentions(signal_id);
