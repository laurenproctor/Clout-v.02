-- supabase/migrations/20260524_multi_workspace_core.sql

-- Add new columns to workspaces
alter table workspaces
  add column if not exists avatar_url      text,
  add column if not exists brand_color     text,
  add column if not exists slug_changed_at timestamptz;

-- Slug history: old slugs from ANY workspace (including deleted) are never re-claimable
create table if not exists workspace_slug_history (
  old_slug     text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  changed_at   timestamptz not null default now()
);

create index if not exists workspace_slug_history_workspace_idx
  on workspace_slug_history(workspace_id);

alter table workspace_slug_history enable row level security;

create policy "workspace_slug_history_select" on workspace_slug_history
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth_user_id()
    )
  );
