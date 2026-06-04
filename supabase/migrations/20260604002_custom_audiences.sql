ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS custom_audiences text[] DEFAULT '{}';
