-- supabase/migrations/20260513000000_publishing_layer.sql

-- ─── publishing_connections ────────────────────────────────────────────────────
-- One row per CMS site per workspace.
-- encrypted_access_token: AES-256-GCM ciphertext, never plaintext.
-- metadata: provider-specific data (e.g. { "wp_username": "admin" }).
-- Health tracking fields allow degraded-state UX and retry suppression.

CREATE TABLE IF NOT EXISTS publishing_connections (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider                    text NOT NULL,
  label                       text NOT NULL,
  site_url                    text NOT NULL,
  encrypted_access_token      text NOT NULL,
  metadata                    jsonb NOT NULL DEFAULT '{}',
  is_active                   boolean NOT NULL DEFAULT true,
  last_successful_publish_at  timestamptz,
  last_failed_publish_at      timestamptz,
  consecutive_failure_count   int NOT NULL DEFAULT 0,
  last_error_message          text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX publishing_connections_workspace_idx
  ON publishing_connections(workspace_id)
  WHERE is_active = true;

ALTER TABLE publishing_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_connections_select" ON publishing_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = publishing_connections.workspace_id
        AND wm.user_id = auth_user_id()
    )
  );

CREATE POLICY "pub_connections_write" ON publishing_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = publishing_connections.workspace_id
        AND wm.user_id = auth_user_id()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ─── published_content ─────────────────────────────────────────────────────────
-- One row per publish attempt. Status follows the full lifecycle state machine.
-- idempotency_key: prevents duplicate publishes on retry.
-- content_hash: short SHA-256 of canonical body, for change detection.
-- canonical_content_id: durable cross-reference to the source content object.
-- provider_metadata_version: formatter version for migration/replay safety.

CREATE TABLE IF NOT EXISTS published_content (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id            uuid REFERENCES publishing_connections(id) ON DELETE SET NULL,
  provider                 text NOT NULL,
  provider_content_id      text,
  provider_url             text,
  title                    text NOT NULL,
  slug                     text,
  status                   text NOT NULL DEFAULT 'queued'
                             CHECK (status IN (
                               'queued','processing','published',
                               'failed','retrying','cancelled','scheduled'
                             )),
  source_type              text NOT NULL DEFAULT 'blog'
                             CHECK (source_type IN ('blog', 'manual')),
  source_id                text,
  canonical_content_id     text,
  idempotency_key          text UNIQUE,
  content_hash             text,
  provider_metadata_version text NOT NULL DEFAULT 'v1',
  metadata                 jsonb NOT NULL DEFAULT '{}',
  published_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX published_content_workspace_idx
  ON published_content(workspace_id);
CREATE INDEX published_content_source_idx
  ON published_content(source_type, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX published_content_canonical_idx
  ON published_content(canonical_content_id)
  WHERE canonical_content_id IS NOT NULL;

ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_content_select" ON published_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = published_content.workspace_id
        AND wm.user_id = auth_user_id()
    )
  );

CREATE POLICY "pub_content_insert" ON published_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = published_content.workspace_id
        AND wm.user_id = auth_user_id()
    )
  );

CREATE POLICY "pub_content_update" ON published_content
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = published_content.workspace_id
        AND wm.user_id = auth_user_id()
    )
  );

-- ─── publishing_jobs ───────────────────────────────────────────────────────────
-- Scheduling and async execution foundation.
-- attempt_count + next_retry_at drive exponential backoff.
-- Trigger.dev worker will poll WHERE status = 'queued' AND scheduled_for <= now().

CREATE TABLE IF NOT EXISTS publishing_jobs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id            uuid REFERENCES publishing_connections(id) ON DELETE SET NULL,
  published_content_id     uuid REFERENCES published_content(id) ON DELETE SET NULL,
  provider                 text NOT NULL,
  status                   text NOT NULL DEFAULT 'queued'
                             CHECK (status IN (
                               'queued','processing','completed',
                               'failed','retrying','cancelled'
                             )),
  scheduled_for            timestamptz,
  attempt_count            int NOT NULL DEFAULT 0,
  next_retry_at            timestamptz,
  idempotency_key          text,
  content_hash             text,
  provider_metadata_version text NOT NULL DEFAULT 'v1',
  -- TODO: canonical_content table — payload currently embeds CanonicalArticle JSON.
  -- Jobs are ephemeral; canonical content is durable. These are different persistence concerns.
  -- Future: replace with canonical_content_id FK once canonical_content table exists.
  payload                  jsonb NOT NULL DEFAULT '{}',
  error_message            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX publishing_jobs_workspace_idx
  ON publishing_jobs(workspace_id);
CREATE INDEX publishing_jobs_queued_idx
  ON publishing_jobs(scheduled_for)
  WHERE status IN ('queued', 'retrying');

ALTER TABLE publishing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_jobs_select" ON publishing_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = publishing_jobs.workspace_id
        AND wm.user_id = auth_user_id()
    )
  );

CREATE POLICY "pub_jobs_write" ON publishing_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = publishing_jobs.workspace_id
        AND wm.user_id = auth_user_id()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ─── Helper function for atomic failure counter increment ──────────────────────

CREATE OR REPLACE FUNCTION increment_connection_failure(
  p_connection_id uuid,
  p_error_message text,
  p_failed_at     timestamptz
) RETURNS void LANGUAGE sql AS $$
  UPDATE publishing_connections SET
    consecutive_failure_count = consecutive_failure_count + 1,
    last_failed_publish_at    = p_failed_at,
    last_error_message        = p_error_message,
    updated_at                = p_failed_at
  WHERE id = p_connection_id;
$$;
