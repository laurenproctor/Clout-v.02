ALTER TABLE brand_imagery_profiles
  ADD COLUMN IF NOT EXISTS uploaded_imagery text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generation_notes text;
