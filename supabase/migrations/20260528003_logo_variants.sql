-- Allow workspaces to designate specific logos for light and dark backgrounds.
-- logo_url_light: the logo to use on dark-background posts
-- logo_url_dark: the logo to use on light-background posts
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS logo_url_light text;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS logo_url_dark text;
