-- Audit trail for every LinkedIn engagement action (comment/reaction), whether drafted,
-- approved, posted, or failed. One row per action, mutated through its lifecycle.
-- Powers moderation, debugging, billing, and support. Service-role writes; members read.

-- 1. channel_credentials gains a metadata jsonb bag (Unipile connection state lives here:
--    metadata.unipile = { accountId, provider, connectedAt, lastSyncAt?, status }).
alter table channel_credentials
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. Engagement actions audit table
create table if not exists linkedin_engagement_actions (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid not null references workspaces(id) on delete cascade,
  channel_id                uuid references channels(id) on delete set null,
  conversation_item_id      uuid references conversation_items(id) on delete set null,
  conversation_response_id  uuid references conversation_responses(id) on delete set null,

  action_type text not null check (action_type in ('comment', 'reaction')),
  provider    text not null check (provider in ('official', 'unipile')),
  status      text not null check (status in (
    'draft', 'pending_user_approval', 'approved', 'posting', 'posted', 'failed', 'cancelled'
  )),

  text                  text,            -- the comment body (null for reactions)
  provider_social_id    text,            -- target post social_id
  provider_request_id   text,            -- provider-side request/trace id
  idempotency_key       text,            -- guards against double-post on retry/double-click
  approval_snapshot     jsonb,           -- what the user actually approved (text + target at approval time)
  published_url         text,
  failure_code          text,
  error_message         text,
  raw_provider_response  jsonb,          -- MINIMIZED + REDACTED: never tokens/cookies/session/private data

  created_by  uuid references users(id) on delete set null,
  approved_by uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  posted_at   timestamptz
);

-- One posted/in-flight action per idempotency key (enforces no-double-post)
create unique index if not exists linkedin_engagement_idempotency_unique_idx
  on linkedin_engagement_actions (idempotency_key)
  where idempotency_key is not null;

create index if not exists linkedin_engagement_workspace_idx
  on linkedin_engagement_actions (workspace_id, created_at desc);
create index if not exists linkedin_engagement_status_idx
  on linkedin_engagement_actions (status);
create index if not exists linkedin_engagement_item_idx
  on linkedin_engagement_actions (conversation_item_id);

-- 3. RLS: members read their workspace's actions; writes happen service-role only.
alter table linkedin_engagement_actions enable row level security;

create policy "linkedin_engagement_select"
  on linkedin_engagement_actions for select
  using (is_workspace_member(workspace_id));
