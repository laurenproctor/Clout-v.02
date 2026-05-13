-- supabase/migrations/20260426_angle_routing.sql

-- 1. Captures: store extracted angles
ALTER TABLE captures
  ADD COLUMN IF NOT EXISTS extracted_angles JSONB;

-- 2. Generations: track which angle was used + group
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS angle_id    TEXT,
  ADD COLUMN IF NOT EXISTS generation_group_id UUID;

CREATE INDEX IF NOT EXISTS generations_group_idx
  ON generations(generation_group_id)
  WHERE generation_group_id IS NOT NULL;

-- 3. Outputs: denormalised copy for fast variant lookup
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS generation_group_id UUID;

CREATE INDEX IF NOT EXISTS outputs_group_idx
  ON outputs(generation_group_id)
  WHERE generation_group_id IS NOT NULL;
