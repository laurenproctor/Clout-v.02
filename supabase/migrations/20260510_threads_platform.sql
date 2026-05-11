-- Add Threads as a supported channel platform.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Run this migration standalone in the Supabase SQL editor.
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'threads';
