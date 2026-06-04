alter table workspace_feed_settings
  add column if not exists website_feed_cache jsonb;
