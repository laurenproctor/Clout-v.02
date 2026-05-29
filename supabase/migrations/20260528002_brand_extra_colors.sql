ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS accent_color_2 text,
  ADD COLUMN IF NOT EXISTS dark_bg_color text;
