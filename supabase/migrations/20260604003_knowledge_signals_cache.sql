alter table workspace_feed_settings
  add column if not exists knowledge_signals_cache jsonb;
