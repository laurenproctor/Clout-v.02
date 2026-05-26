ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS typography_settings jsonb;
