-- Storage bucket for generated visual assets
-- public = true: images must be served by public URL to embed in posts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visual-assets',
  'visual-assets',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Path format: {workspaceId}/{assetId}.{ext}
-- Mirrors brand-assets pattern: folder[1] = workspaceId

CREATE POLICY "visual assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'visual-assets');

CREATE POLICY "workspace members can upload visual assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'visual-assets'
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspace members can delete their visual assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'visual-assets'
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
    )
  );

-- visual_assets table
CREATE TABLE IF NOT EXISTS visual_assets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  output_id             uuid REFERENCES outputs(id) ON DELETE SET NULL,
  parent_asset_id       uuid REFERENCES visual_assets(id) ON DELETE SET NULL,
  generation_group_id   uuid NOT NULL,
  variation_reason      text,
  provider              text NOT NULL DEFAULT 'openai',
  provider_model        text NOT NULL DEFAULT 'dall-e-3',
  original_url          text NOT NULL,
  storage_path          text NOT NULL,
  prompt                text NOT NULL,
  visual_intent         jsonb,
  generation_mode       text NOT NULL DEFAULT 'content-derived',
  render_mode           text NOT NULL DEFAULT 'fully-generated',
  aspect_ratio          text NOT NULL DEFAULT 'landscape',
  mime_type             text NOT NULL DEFAULT 'image/png',
  file_size_bytes       bigint,
  seed                  integer,
  status                text NOT NULL DEFAULT 'completed',
  primitive_payload     jsonb,
  overlay_payload       jsonb,
  intent_input_tokens   integer,
  intent_output_tokens  integer,
  created_at            timestamptz NOT NULL DEFAULT now()
  -- No updated_at: assets are immutable. Regeneration creates a new row.
);

-- Indexes
CREATE INDEX visual_assets_workspace_id_idx        ON visual_assets(workspace_id);
CREATE INDEX visual_assets_output_id_idx           ON visual_assets(output_id) WHERE output_id IS NOT NULL;
CREATE INDEX visual_assets_parent_asset_id_idx     ON visual_assets(parent_asset_id) WHERE parent_asset_id IS NOT NULL;
CREATE INDEX visual_assets_generation_group_id_idx ON visual_assets(generation_group_id);
CREATE INDEX visual_assets_workspace_created_idx   ON visual_assets(workspace_id, created_at DESC);

-- RLS
ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read visual_assets"
  ON visual_assets FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace members can insert visual_assets"
  ON visual_assets FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "workspace admins can delete visual_assets"
  ON visual_assets FOR DELETE
  USING (workspace_role_for(workspace_id) IN ('owner', 'admin'));
