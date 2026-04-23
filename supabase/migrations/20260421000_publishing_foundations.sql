-- supabase/migrations/20260421_publishing_foundations.sql

-- 1. Secure credential storage (service role only — RLS blocks all client access)
CREATE TABLE IF NOT EXISTS channel_credentials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  access_token    text NOT NULL,
  refresh_token   text,
  expires_at      bigint,          -- unix timestamp seconds
  account_id      text,            -- LinkedIn person sub (OpenID)
  account_name    text,
  account_email   text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT channel_credentials_channel_id_key UNIQUE (channel_id)
);

ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;
-- No policies intentionally: service role only

-- 2. Publish logs — operational infrastructure
CREATE TABLE IF NOT EXISTS publish_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  output_id        uuid NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
  channel_id       uuid REFERENCES channels(id) ON DELETE SET NULL,
  platform         text NOT NULL,
  status           text NOT NULL CHECK (status IN ('success', 'failed')),
  provider_post_id text,
  error_code       text,           -- machine-readable: 'token_expired', 'rate_limited', etc.
  error_message    text,
  was_retry        boolean DEFAULT false,
  duration_ms      integer,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publish_logs_workspace_id_idx    ON publish_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS publish_logs_output_id_idx       ON publish_logs (output_id);
CREATE INDEX IF NOT EXISTS publish_logs_status_platform_idx ON publish_logs (status, platform);

ALTER TABLE publish_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read publish logs"
  ON publish_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth_user_id()
    )
  );

-- 3. Idempotency columns on outputs
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS provider_post_id text,
  ADD COLUMN IF NOT EXISTS published_at     timestamptz;
