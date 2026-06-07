-- 20260607001_schema_fix2.sql
-- Second pass: remaining schema drift

-- 1. capture_source enum: add 'topic'
ALTER TYPE capture_source ADD VALUE IF NOT EXISTS 'topic';

-- 2. outputs: add provider_post_url
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS provider_post_url TEXT;

-- 3. channels: add GBP metadata columns
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS google_location_name        TEXT,
  ADD COLUMN IF NOT EXISTS google_location_numeric_id  TEXT,
  ADD COLUMN IF NOT EXISTS google_account_id           TEXT,
  ADD COLUMN IF NOT EXISTS google_location_address     JSONB,
  ADD COLUMN IF NOT EXISTS google_verified             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_profile_photo_url    TEXT;

-- 4. workspace_distribution_settings table (used by UTM settings)
CREATE TABLE IF NOT EXISTS workspace_distribution_settings (
  workspace_id  UUID        PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  utm_settings  JSONB,
  updated_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workspace_distribution_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workspace_distribution_settings'
      AND policyname = 'wds_workspace_member_select'
  ) THEN
    CREATE POLICY "wds_workspace_member_select"
      ON workspace_distribution_settings FOR SELECT
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth_user_id()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workspace_distribution_settings'
      AND policyname = 'wds_workspace_admin_upsert'
  ) THEN
    CREATE POLICY "wds_workspace_admin_upsert"
      ON workspace_distribution_settings FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth_user_id() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
