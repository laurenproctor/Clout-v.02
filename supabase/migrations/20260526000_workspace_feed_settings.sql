-- Each workspace has its own signal feed configuration.
-- Replaces user_profiles as the source of truth for feed filtering.
CREATE TABLE workspace_feed_settings (
  workspace_id    uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  content_topics  text[] DEFAULT '{}',
  services        text[] DEFAULT '{}',
  tone_preference tone_pref NOT NULL DEFAULT 'authoritative',
  brand_name      text DEFAULT '',
  competitors     text[] DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz
);
