-- 20260607000_schema_fix.sql
-- Repair schema drift: add missing enum values, columns, and tables
-- All statements use IF NOT EXISTS / ADD VALUE IF NOT EXISTS guards

-- 1. channel_platform enum: add missing platform values
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'x';
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'threads';
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'instagram';
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'google_business_profile';

-- 2. feed_tab enum: add website and knowledge tabs
ALTER TYPE feed_tab ADD VALUE IF NOT EXISTS 'website';
ALTER TYPE feed_tab ADD VALUE IF NOT EXISTS 'knowledge';

-- 3. captures: add research and angle columns
ALTER TABLE captures
  ADD COLUMN IF NOT EXISTS extracted_angles   JSONB,
  ADD COLUMN IF NOT EXISTS research_sources   JSONB,
  ADD COLUMN IF NOT EXISTS research_summary   TEXT;

-- 4. generations: add angle routing columns
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS angle_id             TEXT,
  ADD COLUMN IF NOT EXISTS generation_group_id  UUID;

CREATE INDEX IF NOT EXISTS generations_group_idx
  ON generations(generation_group_id)
  WHERE generation_group_id IS NOT NULL;

-- 5. outputs: add generation group column
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS generation_group_id  UUID;

CREATE INDEX IF NOT EXISTS outputs_group_idx
  ON outputs(generation_group_id)
  WHERE generation_group_id IS NOT NULL;

-- 6. workspaces: add UTM settings column
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS utm_settings  JSONB;

-- 7. email_events table
CREATE TABLE IF NOT EXISTS email_events (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key    TEXT        NOT NULL UNIQUE,
  type               TEXT        NOT NULL,
  recipient_email    TEXT        NOT NULL,
  user_id            UUID        REFERENCES users(id) ON DELETE SET NULL,
  workspace_id       UUID        REFERENCES workspaces(id) ON DELETE SET NULL,
  payload            JSONB,
  status             TEXT        NOT NULL DEFAULT 'pending',
  attempt_count      INTEGER     NOT NULL DEFAULT 0,
  last_attempted_at  TIMESTAMPTZ,
  resend_id          TEXT,
  sent_at            TIMESTAMPTZ,
  error              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_user_id_idx       ON email_events(user_id);
CREATE INDEX IF NOT EXISTS email_events_workspace_id_idx  ON email_events(workspace_id);
CREATE INDEX IF NOT EXISTS email_events_status_idx        ON email_events(status);
CREATE INDEX IF NOT EXISTS email_events_created_at_idx    ON email_events(created_at DESC);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_events'
      AND policyname = 'super_admin_read_email_events'
  ) THEN
    CREATE POLICY "super_admin_read_email_events"
      ON email_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth_user_id()
            AND operator_role = 'super_admin'
        )
      );
  END IF;
END $$;

-- 8. provider_health_logs table
CREATE TABLE IF NOT EXISTS provider_health_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id     UUID        REFERENCES channels(id) ON DELETE SET NULL,
  platform       TEXT        NOT NULL,
  event_type     TEXT        NOT NULL,
  error_code     TEXT,
  error_message  TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_workspace
  ON provider_health_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_health_platform
  ON provider_health_logs(platform, event_type);

ALTER TABLE provider_health_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provider_health_logs'
      AND policyname = 'provider_health_workspace_member_select'
  ) THEN
    CREATE POLICY "provider_health_workspace_member_select"
      ON provider_health_logs FOR SELECT
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth_user_id()
        )
      );
  END IF;
END $$;
