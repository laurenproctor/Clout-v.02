-- ============================================================
-- SYNDICATE PHASE 1
-- Signal intelligence sessions only. No asset generation tables.
-- ============================================================

create table if not exists syndicate_sessions (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  user_id                 uuid references users(id) on delete set null,
  source_url              text not null,
  source_type             text,
  source_title            text,
  status                  text not null default 'processing',
  -- persisted separately for replayability, debugging, prompt tuning, ontology iteration
  extracted_content       jsonb,
  raw_signals             jsonb,
  narrative_analysis      jsonb,
  strategic_read          jsonb,
  counterfactual_analysis jsonb,
  -- versioning from day one: prompts and ontology will evolve
  analysis_version        text,
  signal_version          text,
  ontology_version        text,
  prompt_version          text,
  timing_data             jsonb,
  created_at              timestamptz not null default now()
);

create index on syndicate_sessions (workspace_id);
create index on syndicate_sessions (user_id);

alter table syndicate_sessions enable row level security;

create policy "syndicate_sessions_select" on syndicate_sessions
  for select using (
    is_workspace_member(workspace_id)
    or is_assigned_operator(workspace_id)
    or is_super_admin()
  );

create policy "syndicate_sessions_insert" on syndicate_sessions
  for insert with check (
    workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  );

create policy "syndicate_sessions_update" on syndicate_sessions
  for update using (
    workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
    or is_super_admin()
  );
