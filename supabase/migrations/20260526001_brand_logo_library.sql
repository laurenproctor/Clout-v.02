-- Support multiple logos per workspace brand profile.
-- logo_url remains the "active" logo used in content generation.
-- logo_library stores all uploaded logos so users can switch between them.
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS logo_library text[] DEFAULT '{}';
