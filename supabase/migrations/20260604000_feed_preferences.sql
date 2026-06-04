-- Feed intelligence: store Claude-derived preference profile and
-- validated derived topics per workspace.
ALTER TABLE workspace_feed_settings
  ADD COLUMN feed_preferences  jsonb    DEFAULT NULL,
  ADD COLUMN derived_topics    text[]   DEFAULT '{}';
