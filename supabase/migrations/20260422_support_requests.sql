create table support_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,
  workspace_id  uuid references workspaces(id) on delete set null,
  category      text not null check (category in ('question', 'bug', 'feature', 'billing', 'call')),
  message       text not null,
  screenshot_url text,
  user_email    text,
  current_route text,
  browser_info  text,
  created_at    timestamptz not null default now()
);

alter table support_requests enable row level security;
-- All access via service role only — no client-facing policies needed
