-- Migration: Add narrative intelligence fields to outputs
-- These fields support the calendar concept model and narrative arc grouping.

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS concept_id       uuid,
  ADD COLUMN IF NOT EXISTS narrative_role   text
    CHECK (narrative_role IN ('contrarian','framework','evidence','cta','tension','founder')),
  ADD COLUMN IF NOT EXISTS narrative_arc_id   uuid,
  ADD COLUMN IF NOT EXISTS narrative_arc_name text,
  ADD COLUMN IF NOT EXISTS goal text
    CHECK (goal IN ('authority','conversation','leads','loyalty','education','subscribers','positioning','retention')),
  ADD COLUMN IF NOT EXISTS funnel_stage text
    CHECK (funnel_stage IN ('top','awareness','trust','consideration','conversion','retention')),
  ADD COLUMN IF NOT EXISTS resonance_prediction text
    CHECK (resonance_prediction IN ('high','medium','low'));

-- Index concept_id for the calendar grouping query
CREATE INDEX IF NOT EXISTS idx_outputs_concept_id
  ON outputs (concept_id)
  WHERE concept_id IS NOT NULL;

-- Index for narrative arc grouping
CREATE INDEX IF NOT EXISTS idx_outputs_narrative_arc_id
  ON outputs (narrative_arc_id)
  WHERE narrative_arc_id IS NOT NULL;

-- Index for goal-based filtering (intelligence bar)
CREATE INDEX IF NOT EXISTS idx_outputs_goal
  ON outputs (workspace_id, goal, created_at DESC)
  WHERE goal IS NOT NULL;

COMMENT ON COLUMN outputs.concept_id IS
  'Groups all platform-specific posts that represent the same content concept. Backfilled from generation_group_id.';
COMMENT ON COLUMN outputs.narrative_role IS
  'AI-assigned role in narrative sequence (contrarian, framework, evidence, etc.)';
COMMENT ON COLUMN outputs.goal IS
  'Strategic objective this post serves (authority, leads, loyalty, etc.)';
COMMENT ON COLUMN outputs.funnel_stage IS
  'Position in buyer funnel (top, awareness, trust, consideration, conversion, retention)';
COMMENT ON COLUMN outputs.resonance_prediction IS
  'Predicted audience resonance level (high, medium, low)';
COMMENT ON COLUMN outputs.narrative_arc_id IS
  'Groups posts that form a narrative arc or story sequence.';
COMMENT ON COLUMN outputs.narrative_arc_name IS
  'Human-readable name for the narrative arc.';
