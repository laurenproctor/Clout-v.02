-- Gates for the LinkedIn beta connector: per-workspace opt-in settings, per-user
-- disclosure acceptance, and a global admin kill switch. These must be in place
-- before any Unipile route ships.

-- 1. Per-workspace beta toggles (separate gates — a workspace may accept monitoring
--    but not engagement; page fallback is its own gate, disabled by default).
alter table workspace_feed_settings
  add column if not exists linkedin_beta jsonb not null
    default '{"monitoring": false, "assistedEngagement": false, "pageFallback": false}'::jsonb;

-- 2. Per-user disclosure acceptance. One current acceptance per (user, workspace);
--    re-accepting bumps the version + timestamp. A user must hold an acceptance for
--    the *current* disclosure version before any connector activity.
create table if not exists linkedin_connector_optins (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  workspace_id       uuid not null references workspaces(id) on delete cascade,
  disclosure_version text not null,
  accepted_at        timestamptz not null default now(),
  unique (user_id, workspace_id)
);

alter table linkedin_connector_optins enable row level security;

create policy "linkedin_optins_select"
  on linkedin_connector_optins for select
  using (user_id = auth_user_id() and is_workspace_member(workspace_id));
create policy "linkedin_optins_insert"
  on linkedin_connector_optins for insert
  with check (user_id = auth_user_id() and is_workspace_member(workspace_id));
create policy "linkedin_optins_update"
  on linkedin_connector_optins for update
  using (user_id = auth_user_id() and is_workspace_member(workspace_id));

-- 3. Global admin kill switch. Generic table so future risk-bearing features can reuse it.
--    Service-role only (RLS enabled, no policies); flipped via an admin server route.
create table if not exists feature_kill_switches (
  key        text primary key,
  disabled   boolean not null default false,
  reason     text,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table feature_kill_switches enable row level security;

insert into feature_kill_switches (key, disabled, reason)
  values ('unipile', false, 'initial seed — connector enabled')
  on conflict (key) do nothing;
