-- supabase/migrations/20260612008_pinterest_platform.sql
-- Add Pinterest as a supported channel platform.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block — kept standalone,
-- following the threads/bluesky precedent. Run before 20260612009_pinterest_boards.sql.
alter type channel_platform add value if not exists 'pinterest';
