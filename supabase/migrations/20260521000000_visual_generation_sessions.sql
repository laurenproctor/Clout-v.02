-- supabase/migrations/20260521000000_visual_generation_sessions.sql
create table if not exists visual_generation_sessions (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  output_id         uuid not null references outputs(id) on delete cascade,
  parent_session_id uuid references visual_generation_sessions(id),
  version           integer not null default 1,
  is_active         boolean not null default true,
  aspect_ratio      text not null default 'landscape',
  quality           text not null default 'standard',
  visual_objective  text,
  audience_frame    text,
  emotional_tone    text,
  key_idea          text,
  generation_mode   text,
  created_at        timestamptz not null default now()
);

create index on visual_generation_sessions(output_id, is_active);

-- RLS
alter table visual_generation_sessions enable row level security;

create policy "workspace members can read their sessions"
  on visual_generation_sessions for select
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = (select id from users where clerk_id = auth.uid()::text)
    )
  );

create policy "workspace members can insert sessions"
  on visual_generation_sessions for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = (select id from users where clerk_id = auth.uid()::text)
    )
  );

create policy "workspace members can update sessions"
  on visual_generation_sessions for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = (select id from users where clerk_id = auth.uid()::text)
    )
  );
