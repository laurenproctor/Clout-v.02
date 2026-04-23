CREATE TABLE IF NOT EXISTS brand_imagery_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE NOT NULL,
  visual_styles       text[]  NOT NULL DEFAULT '{}',
  imagery_type        text,
  composition         text,
  overlay_text_style  text,
  mood_traits         text[]  NOT NULL DEFAULT '{}',
  negative_rules      text[]  NOT NULL DEFAULT '{}',
  example_board       text[]  NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brand_imagery_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read brand_imagery_profiles"
  ON brand_imagery_profiles FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace admins can update brand_imagery_profiles"
  ON brand_imagery_profiles FOR ALL
  USING (workspace_role_for(workspace_id) IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION create_imagery_profile_for_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO brand_imagery_profiles (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created_create_imagery_profile
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION create_imagery_profile_for_workspace();

-- Backfill existing workspaces
INSERT INTO brand_imagery_profiles (workspace_id)
SELECT id FROM workspaces
ON CONFLICT (workspace_id) DO NOTHING;
