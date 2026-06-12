-- supabase/migrations/20260612004_campaigns.sql
-- Campaigns: a first-class strategic objective. Every campaign must answer
-- "what is this campaign for?" via a required goal (strategic category) and a
-- required purpose (specific intent, >= 20 chars). Outputs can belong to a campaign.

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  goal          text not null check (goal in (
                  'authority','conversation','leads','loyalty',
                  'education','subscribers','positioning','retention')),
  purpose       text not null check (length(trim(purpose)) >= 20),
  status        text not null default 'active'
                  check (status in ('active','paused','archived')),
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint campaigns_name_not_empty check (length(trim(name)) > 0)
);

create index campaigns_workspace_idx on campaigns(workspace_id) where deleted_at is null;
create index campaigns_status_idx    on campaigns(workspace_id, status) where deleted_at is null;

-- Outputs belong to a campaign (nullable). on delete set null keeps the output if
-- the campaign is hard-deleted later.
alter table outputs add column campaign_id uuid references campaigns(id) on delete set null;
create index outputs_campaign_idx on outputs(campaign_id) where campaign_id is not null;

alter table campaigns enable row level security;

create policy "campaigns_select" on campaigns for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "campaigns_insert" on campaigns for insert with check (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "campaigns_update" on campaigns for update using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);
