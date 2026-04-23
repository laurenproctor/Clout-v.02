-- supabase/migrations/20260423_x_channel.sql

-- 1. Rename 'twitter' → 'x' in channel_platform enum
--    Postgres requires creating a new enum, swapping, then dropping the old one.
ALTER TYPE channel_platform RENAME TO channel_platform_old;

CREATE TYPE channel_platform AS ENUM ('linkedin', 'newsletter', 'x');

-- Migrate existing rows
ALTER TABLE channels
  ALTER COLUMN platform TYPE channel_platform
  USING platform::text::channel_platform;

DROP TYPE channel_platform_old;

-- 2. Add provider_post_url to outputs (stores the human-readable link to the published post)
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS provider_post_url text;

-- 3. Provider health logs — captures connect, refresh, and publish lifecycle events
CREATE TABLE IF NOT EXISTS provider_health_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id    uuid REFERENCES channels(id) ON DELETE SET NULL,
  platform      channel_platform NOT NULL,
  event_type    text NOT NULL,        -- 'connect_success' | 'connect_failed' | 'refresh_failed' | 'publish_failed'
  error_code    text,
  error_message text,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_workspace ON provider_health_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_health_platform  ON provider_health_logs (platform, event_type);

-- RLS: service role only — no client access to health logs
ALTER TABLE provider_health_logs ENABLE ROW LEVEL SECURITY;
