-- Add 'topic' as a valid capture source
-- Note: ALTER TYPE ADD VALUE is non-transactional; run this migration before deploying code
ALTER TYPE capture_source ADD VALUE IF NOT EXISTS 'topic';

-- Add research columns to captures
ALTER TABLE captures
  ADD COLUMN IF NOT EXISTS research_sources JSONB,
  ADD COLUMN IF NOT EXISTS research_summary TEXT;
