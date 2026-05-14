-- Extend the channel_platform enum
ALTER TYPE channel_platform ADD VALUE IF NOT EXISTS 'google_business_profile';

-- Add GBP-specific metadata to channels table
-- google_location_name: canonical API resource path (e.g. accounts/123456/locations/789012)
-- google_location_numeric_id: optional extracted numeric ID for convenience
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS google_location_name        text,
  ADD COLUMN IF NOT EXISTS google_location_numeric_id  text,
  ADD COLUMN IF NOT EXISTS google_account_id           text,
  ADD COLUMN IF NOT EXISTS google_location_address     jsonb,
  ADD COLUMN IF NOT EXISTS google_verified             boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_profile_photo_url    text;
