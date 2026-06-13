-- supabase/migrations/20260612009_pinterest_boards.sql
-- Pinterest boards (synced child destinations of a Pinterest channel) and the
-- campaign-level default board mapping. One channels row = one Pinterest account;
-- boards live here. Default board resolves: per-output override -> campaign default
-- -> account default. Boards are NEVER hard-deleted on sync — vanished boards are
-- marked is_available = false so old scheduled outputs stay debuggable.

-- 1. Boards synced from a connected Pinterest account
create table pinterest_boards (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  channel_id      uuid not null references channels(id) on delete cascade,
  board_id        text not null,            -- Pinterest API board id (NOT this row's uuid)
  name            text not null,
  privacy         text,
  url             text,
  is_default      boolean not null default false,  -- account-level default board
  is_available    boolean not null default true,   -- false once a sync no longer returns it
  last_seen_at    timestamptz,
  last_sync_error text,
  synced_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (channel_id, board_id)
);

create index pinterest_boards_channel_idx   on pinterest_boards(channel_id);
create index pinterest_boards_workspace_idx on pinterest_boards(workspace_id);
-- At most one default board per channel.
create unique index pinterest_boards_one_default_per_channel
  on pinterest_boards(channel_id) where is_default;

alter table pinterest_boards enable row level security;

create policy "pinterest_boards_select" on pinterest_boards for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "pinterest_boards_insert" on pinterest_boards for insert with check (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "pinterest_boards_update" on pinterest_boards for update using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "pinterest_boards_delete" on pinterest_boards for delete using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);

-- 2. Campaign-level default board, per Pinterest account (channel)
create table pinterest_campaign_boards (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  channel_id    uuid not null references channels(id) on delete cascade,
  board_id      text not null,             -- Pinterest API board id
  created_at    timestamptz not null default now(),
  unique (campaign_id, channel_id)
);

create index pinterest_campaign_boards_campaign_idx on pinterest_campaign_boards(campaign_id);

alter table pinterest_campaign_boards enable row level security;

create policy "pinterest_campaign_boards_select" on pinterest_campaign_boards for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "pinterest_campaign_boards_insert" on pinterest_campaign_boards for insert with check (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "pinterest_campaign_boards_update" on pinterest_campaign_boards for update using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "pinterest_campaign_boards_delete" on pinterest_campaign_boards for delete using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
