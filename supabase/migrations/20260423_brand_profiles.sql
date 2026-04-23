-- Storage bucket for brand assets (logos, custom fonts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "workspace members can read brand assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth_user_id()::text
  );

CREATE POLICY "workspace members can upload brand assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth_user_id()::text
  );

CREATE POLICY "workspace members can delete brand assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth_user_id()::text
  );

-- Brand profiles table (1:1 with workspace)
CREATE TABLE IF NOT EXISTS brand_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE NOT NULL,
  brand_name      text,
  logo_url        text,
  primary_color   text NOT NULL DEFAULT '#1A1A1A',
  secondary_color text NOT NULL DEFAULT '#FFFFFF',
  accent_color    text NOT NULL DEFAULT '#D4A574',
  font_heading    text NOT NULL DEFAULT 'Playfair Display',
  font_body       text NOT NULL DEFAULT 'Inter',
  font_heading_url text,
  font_body_url   text,
  tone_traits     text[]  NOT NULL DEFAULT '{}',
  style_traits    jsonb   NOT NULL DEFAULT '{
    "border_radius": "balanced",
    "visual_density": "balanced",
    "color_scheme": "light",
    "texture": "none"
  }'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read brand_profiles"
  ON brand_profiles FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace admins can update brand_profiles"
  ON brand_profiles FOR ALL
  USING (workspace_role_for(workspace_id) IN ('owner', 'admin'));

-- Auto-create brand profile when workspace is created
CREATE OR REPLACE FUNCTION create_brand_profile_for_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO brand_profiles (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created_create_brand_profile
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION create_brand_profile_for_workspace();

-- Backfill existing workspaces
INSERT INTO brand_profiles (workspace_id)
SELECT id FROM workspaces
ON CONFLICT (workspace_id) DO NOTHING;
