ALTER TABLE workspace_feed_settings
  ADD COLUMN IF NOT EXISTS conversation_preferences jsonb NOT NULL DEFAULT '{"focusTopics":[],"blockedKeywords":[],"minOpportunityScore":40,"mutedSources":[]}'::jsonb;
