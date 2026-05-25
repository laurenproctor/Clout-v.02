create table if not exists workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         workspace_role not null default 'editor',
  invited_by   uuid not null references users(id),
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

create index workspace_invites_workspace_idx on workspace_invites(workspace_id);
create index workspace_invites_email_idx on workspace_invites(email);

alter table workspace_invites enable row level security;

create policy "workspace_invites_select" on workspace_invites
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth_user_id()
    )
  );

create policy "workspace_invites_insert" on workspace_invites
  for insert with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth_user_id() and role in ('owner', 'admin')
    )
  );

create policy "workspace_invites_delete" on workspace_invites
  for delete using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth_user_id() and role in ('owner', 'admin')
    )
  );
