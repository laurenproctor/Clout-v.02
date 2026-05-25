-- supabase/migrations/20260423_publishing_engine.sql

-- 1. Add 'publishing' and 'failed' to output_status enum
alter type output_status add value if not exists 'publishing' after 'queued';
alter type output_status add value if not exists 'failed' after 'published';

-- 2. Add last_publish_error to outputs
alter table outputs
  add column if not exists last_publish_error text;
