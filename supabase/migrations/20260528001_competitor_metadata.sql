ALTER TABLE workspace_feed_settings
  ADD COLUMN IF NOT EXISTS competitor_metadata jsonb DEFAULT '{}';
