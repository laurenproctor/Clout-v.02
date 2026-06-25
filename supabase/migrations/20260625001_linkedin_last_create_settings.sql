-- Remember a workspace's last-used LinkedIn create settings (strategy + post type) so the
-- create flow can pre-fill them on the next post. Whitelisted, sanitized blob; see
-- lib/linkedin/create-settings.ts for the shape and validation.
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS linkedin_last_create_settings jsonb;
