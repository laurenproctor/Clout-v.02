-- Phase 2: hybrid-overlay template system additions
-- visual_assets gets: template_id, composed_url, template_payload, quality_score
-- brand_profiles gets: preferred_template_mode, signature_template_id, token_overrides

-- ── visual_assets ─────────────────────────────────────────────────────────────

ALTER TABLE visual_assets
  ADD COLUMN IF NOT EXISTS template_id       text,
  ADD COLUMN IF NOT EXISTS composed_url      text,
  ADD COLUMN IF NOT EXISTS template_payload  jsonb,
  ADD COLUMN IF NOT EXISTS quality_score     numeric(4,3);

-- Index for filtering by template type
CREATE INDEX IF NOT EXISTS visual_assets_template_id_idx
  ON visual_assets (template_id)
  WHERE template_id IS NOT NULL;

-- ── brand_profiles ────────────────────────────────────────────────────────────

ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS preferred_template_mode  text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS signature_template_id    text,
  ADD COLUMN IF NOT EXISTS token_overrides          jsonb;

-- Constraint: signature_template_id may only be set when mode = 'signature'
-- (enforced at application layer — not a DB constraint to avoid migration complexity)

-- ── Storage path update (documentation only — no data migration needed) ───────
-- New assets use {workspaceId}/backgrounds/{assetId}.{ext} (background)
-- and {workspaceId}/composed/{assetId}.png (composed output).
-- Existing assets keep their original paths unchanged.
