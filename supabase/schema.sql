-- ============================================================
-- CLOUT v1 DATABASE SCHEMA
-- Target: Supabase (PostgreSQL)
-- Apply via: Supabase dashboard SQL editor or supabase db push
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
create type workspace_role as enum ('owner', 'admin', 'editor', 'viewer');
create type operator_role as enum ('super_admin', 'agency_operator');
create type subscription_plan as enum ('free', 'pro', 'business', 'enterprise');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'paused');
create type capture_source as enum ('text', 'voice', 'structured', 'url');
create type capture_status as enum ('pending', 'processing', 'ready', 'failed');
create type generation_status as enum ('pending', 'generating', 'complete', 'failed');
create type output_status as enum ('draft', 'review', 'approved', 'queued', 'publishing', 'published', 'failed', 'archived');
create type channel_platform as enum ('linkedin', 'newsletter', 'twitter', 'bluesky');
create type lens_scope as enum ('system', 'workspace');
create type job_type as enum ('transcribe', 'generate', 'summarize', 'reformat');
create type job_status as enum ('queued', 'running', 'done', 'failed', 'canceled');
create type usage_event_type as enum (
  'capture_created', 'generation_run', 'output_published',
  'lens_applied', 'voice_transcribed', 'member_invited'
);
create type audit_action as enum (
  'create', 'update', 'delete', 'publish',
  'approve', 'assign', 'restore', 'soft_delete'
);
create type email_type as enum ('welcome', 'output_ready', 'payment_failed');
create type email_status as enum ('pending', 'sent', 'failed');
create type tone_pref as enum ('authoritative', 'conversational', 'provocative');

-- ============================================================
-- USERS  (Clerk mirror — synced via webhook)
-- ============================================================
create table users (
  id            uuid primary key default gen_random_uuid(),
  clerk_id      text unique not null,
  email         text not null,
  full_name     text,
  avatar_url    text,
  operator_role operator_role,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index users_clerk_id_idx on users(clerk_id);
create index users_email_idx on users(email);
create index users_operator_role_idx on users(operator_role) where operator_role is not null;

-- RLS helper: resolve Clerk JWT sub to internal user id
create or replace function auth_user_id()
returns uuid language sql stable security definer as $$
  select id from users
  where clerk_id = coalesce(
    current_setting('request.jwt.claims', true)::jsonb->>'sub',
    auth.uid()::text
  )
  and deleted_at is null
$$;

-- ============================================================
-- WORKSPACES
-- ============================================================
create table workspaces (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text unique not null,
  plan                 subscription_plan not null default 'free',
  assigned_operator_id uuid references users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  avatar_url           text,
  brand_color          text,
  slug_changed_at      timestamptz,
  custom_audiences     text[] default '{}',
  linkedin_last_create_settings jsonb
);
create unique index workspaces_slug_idx on workspaces(slug) where deleted_at is null;
create index workspaces_operator_idx on workspaces(assigned_operator_id)
  where assigned_operator_id is not null;

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         workspace_role not null default 'editor',
  invited_by   uuid references users(id) on delete set null,
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on workspace_members(user_id);
create index workspace_members_role_idx on workspace_members(workspace_id, role);

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

create policy "workspace_invites_update_accept" on workspace_invites
  for update using (
    email = (select email from users where id = auth_user_id())
  )
  with check (
    accepted_at is not null
  );

-- Slug history: old slugs from ANY workspace (including deleted) are never re-claimable
create table workspace_slug_history (
  old_slug     text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  changed_at   timestamptz not null default now()
);
create index workspace_slug_history_workspace_idx on workspace_slug_history(workspace_id);

alter table workspace_slug_history enable row level security;

create policy "workspace_slug_history_select" on workspace_slug_history
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth_user_id()
    )
  );

-- ============================================================
-- WORKSPACE FEED SETTINGS
-- ============================================================
create table workspace_feed_settings (
  workspace_id              uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  content_topics            text[] DEFAULT '{}',
  services                  text[] DEFAULT '{}',
  tone_preference           tone_pref NOT NULL DEFAULT 'authoritative',
  brand_name                text DEFAULT '',
  competitors               text[] DEFAULT '{}',
  knowledge_signals_cache   jsonb,
  website_url               text,
  website_feed_cache        jsonb,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz
);

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references workspaces(id) on delete cascade,
  display_name                    text,
  bio                             text,
  industries                      text[]        default '{}',
  target_audiences                text[]        default '{}',
  tone_notes                      text,
  mental_models                   jsonb         not null default '[]',
  philosophies                    jsonb         not null default '[]',
  sample_content                  text[]        default '{}',
  purpose                         text,
  role                            text,
  industry                        text,
  expertise                       text,
  profile_insights                jsonb,
  channels                        text[]        default '{}',
  audience_targets                text[]        default '{}',
  audience_perception             text[]        default '{}',
  onboarding_completed_at         timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);
create unique index profiles_workspace_idx on profiles(workspace_id);

-- ============================================================
-- ONBOARDING GENERATIONS
-- ============================================================
create table onboarding_generations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  positioning   text,
  post_ideas    jsonb not null default '[]',
  draft_post    text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);
create unique index onboarding_generations_workspace_idx on onboarding_generations(workspace_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null unique references workspaces(id) on delete cascade,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  plan                     subscription_plan not null default 'free',
  status                   subscription_status not null default 'trialing',
  entitlements jsonb not null default '{
    "captures_per_month":    10,
    "generations_per_month": 20,
    "lenses_max":            3,
    "members_max":           1,
    "voice_minutes_per_month": 30,
    "operator_access":       false
  }'::jsonb,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index subscriptions_stripe_sub_idx on subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ============================================================
-- LENSES
-- ============================================================
create table lenses (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  created_by    uuid references users(id) on delete set null,
  scope         lens_scope not null default 'workspace',
  name          text not null,
  description   text,
  system_prompt text not null default '',
  lens_type     text,
  tags          text[] default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint lenses_system_no_workspace check (
    (scope = 'system' and workspace_id is null)
    or (scope = 'workspace' and workspace_id is not null)
  )
);
create index lenses_workspace_idx on lenses(workspace_id) where workspace_id is not null;
create index lenses_scope_active_idx on lenses(scope, is_active) where deleted_at is null;
create index lenses_tags_idx on lenses using gin(tags);

-- ============================================================
-- CAPTURES
-- ============================================================
create table captures (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  created_by      uuid not null references users(id),
  source          capture_source not null,
  status          capture_status not null default 'pending',
  raw_content     text,
  source_url      text,
  structured_data jsonb,
  audio_path      text,
  transcript      text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index captures_workspace_status_idx on captures(workspace_id, status)
  where deleted_at is null;
create index captures_created_by_idx on captures(created_by);
create index captures_created_at_idx on captures(workspace_id, created_at desc)
  where deleted_at is null;

-- ============================================================
-- GENERATIONS
-- ============================================================
create table generations (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  capture_id      uuid not null references captures(id) on delete cascade,
  lens_id         uuid not null references lenses(id),
  profile_id      uuid not null references profiles(id),
  status          generation_status not null default 'pending',
  model           text not null,
  prompt_snapshot text,
  raw_response    text,
  error_message   text,
  duration_ms     int,
  token_count     int,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index generations_workspace_idx on generations(workspace_id);
create index generations_capture_idx on generations(capture_id);
create index generations_status_idx on generations(status) where status != 'complete';

-- ============================================================
-- CHANNELS
-- ============================================================
create table channels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform     channel_platform not null,
  label        text,
  account_id   text,                          -- platform-specific account/page identifier
  account_type text not null default 'personal', -- personal | page | business
  config       jsonb not null default '{}'::jsonb,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, platform, account_id) -- per-account uniqueness; allows multiple accounts per platform
);
create index channels_workspace_idx on channels(workspace_id) where is_active = true;

-- ============================================================
-- SCHEDULING PREFERENCES
-- ============================================================
create table scheduling_preferences (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  posts_per_week   int not null default 3 check (posts_per_week between 1 and 14),
  preferred_days   int[] not null default '{1,3,5}',   -- ISO weekday: 1=Mon … 7=Sun
  preferred_times  text[] not null default '{"09:00","12:00","17:00"}',  -- HH:MM
  timezone              text not null default 'America/New_York',
  weekly_digest_enabled boolean not null default true,
  weekly_digest_day     smallint default 1,  -- 1=Monday
  weekly_digest_hour    smallint default 8,  -- 8am workspace tz
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (workspace_id)
);
create index scheduling_preferences_workspace_idx on scheduling_preferences(workspace_id);

-- ============================================================
-- PUBLISHING FOUNDATIONS (credentials, logs, idempotency)
-- ============================================================
-- channel_credentials: OAuth tokens per channel, service role only, RLS blocks client access
-- publish_logs: operational audit — queryable for failure analysis by workspace/output/platform/status
-- outputs.provider_post_id: LinkedIn post URN (idempotency key, prevents double-posting)
-- outputs.published_at: wall-clock timestamp of successful publish

-- ============================================================
-- OUTPUTS
-- ============================================================
-- ============================================================
-- CAMPAIGNS  (strategic objective; required goal + purpose)
-- ============================================================
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

create table outputs (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  generation_id  uuid references generations(id),  -- nullable: syndication outputs have no generation
  channel_id     uuid references channels(id) on delete set null,
  campaign_id    uuid references campaigns(id) on delete set null,
  content_type   text not null default 'standard',
  status         output_status not null default 'draft',
  title          text,
  content        jsonb not null default '{}'::jsonb,
  approved_by    uuid references users(id) on delete set null,
  approved_at    timestamptz,
  scheduled_at        timestamptz,
  last_publish_error  text,
  approved_for_week   boolean not null default false,
  week_bucket         date,
  performance_snapshot jsonb,
  concept_id          uuid,
  narrative_role      text check (narrative_role in ('contrarian','framework','evidence','cta','tension','founder')),
  narrative_arc_id    uuid,
  narrative_arc_name  text,
  goal                text check (goal in ('authority','conversation','leads','loyalty','education','subscribers','positioning','retention')),
  funnel_stage        text check (funnel_stage in ('top','awareness','trust','consideration','conversion','retention')),
  resonance_prediction text check (resonance_prediction in ('high','medium','low')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index outputs_workspace_status_idx on outputs(workspace_id, status)
  where deleted_at is null;
create index outputs_generation_idx on outputs(generation_id);
create index outputs_channel_idx on outputs(channel_id) where channel_id is not null;
create index outputs_approved_at_idx on outputs(workspace_id, approved_at desc)
  where approved_at is not null and deleted_at is null;
create index outputs_title_search_idx on outputs
  using gin(to_tsvector('english', coalesce(title, '')));
create index outputs_campaign_idx on outputs(campaign_id) where campaign_id is not null;

-- ============================================================
-- OUTPUT VERSIONS  (append-only)
-- ============================================================
create table output_versions (
  id             uuid primary key default gen_random_uuid(),
  output_id      uuid not null references outputs(id) on delete cascade,
  version_number int not null,
  content        jsonb not null,
  change_summary text,
  edited_by      uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (output_id, version_number)
);
create index output_versions_output_idx on output_versions(output_id, version_number desc);

-- ============================================================
-- JOBS
-- ============================================================
create table jobs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  type          job_type not null,
  status        job_status not null default 'queued',
  resource_type text not null,
  resource_id   uuid not null,
  payload       jsonb not null default '{}'::jsonb,
  result        jsonb,
  error_message text,
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  scheduled_at  timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index jobs_status_scheduled_idx on jobs(status, scheduled_at)
  where status in ('queued', 'running');
create index jobs_workspace_idx on jobs(workspace_id);
create index jobs_resource_idx on jobs(resource_type, resource_id);

-- ============================================================
-- USAGE EVENTS
-- ============================================================
create table usage_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid references users(id) on delete set null,
  event_type    usage_event_type not null,
  resource_type text,
  resource_id   uuid,
  quantity      int not null default 1,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index usage_events_workspace_period_idx
  on usage_events(workspace_id, created_at desc);
create index usage_events_type_idx on usage_events(event_type, created_at desc);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  actor_id      uuid references users(id) on delete set null,
  action        audit_action not null,
  resource_type text not null,
  resource_id   uuid,
  before_state  jsonb,
  after_state   jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index audit_logs_workspace_idx on audit_logs(workspace_id, created_at desc);
create index audit_logs_actor_idx on audit_logs(actor_id);
create index audit_logs_resource_idx on audit_logs(resource_type, resource_id);

-- ============================================================
-- EMAIL EVENTS  (observability + idempotency for transactional email)
-- ============================================================
create table email_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique not null,
  type email_type not null,
  recipient_email text not null,
  user_id uuid references users(id) on delete set null,
  workspace_id uuid references workspaces(id) on delete set null,
  payload jsonb,
  status email_status not null default 'pending',
  resend_id text,
  error text,
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_events_user_id_idx on email_events(user_id);
create index email_events_workspace_id_idx on email_events(workspace_id);
create index email_events_type_status_idx on email_events(type, status);

alter table email_events enable row level security;

create policy "super_admin can read email_events"
  on email_events for select
  using (
    exists (
      select 1 from users
      where users.clerk_id = (auth.jwt() ->> 'sub')
      and users.operator_role = 'super_admin'
    )
  );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table profiles          enable row level security;
alter table subscriptions     enable row level security;
alter table lenses            enable row level security;
alter table captures          enable row level security;
alter table generations       enable row level security;
alter table campaigns         enable row level security;
alter table outputs           enable row level security;
alter table output_versions   enable row level security;
alter table channels          enable row level security;
alter table jobs              enable row level security;
alter table usage_events      enable row level security;
alter table audit_logs        enable row level security;
alter table onboarding_generations enable row level security;

-- ---- Helper functions ----------------------------------------
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth_user_id()
  )
$$;

create or replace function workspace_role_for(ws_id uuid)
returns workspace_role language sql stable security definer as $$
  select role from workspace_members
  where workspace_id = ws_id and user_id = auth_user_id()
$$;

create or replace function is_operator()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from users
    where id = auth_user_id() and operator_role is not null and deleted_at is null
  )
$$;

create or replace function is_super_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from users
    where id = auth_user_id() and operator_role = 'super_admin' and deleted_at is null
  )
$$;

create or replace function is_assigned_operator(ws_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from workspaces
    where id = ws_id and assigned_operator_id = auth_user_id()
  )
$$;

-- ---- Policies -----------------------------------------------

-- workspaces
create policy "workspaces_select" on workspaces for select using (
  is_workspace_member(id) or is_assigned_operator(id) or is_super_admin()
);
create policy "workspaces_update" on workspaces for update using (
  workspace_role_for(id) in ('owner', 'admin') or is_super_admin()
);

-- workspace_members
create policy "members_select" on workspace_members for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "members_insert" on workspace_members for insert with check (
  workspace_role_for(workspace_id) in ('owner', 'admin') or is_super_admin()
);
create policy "members_delete" on workspace_members for delete using (
  workspace_role_for(workspace_id) = 'owner' or is_super_admin()
);

-- profiles
create policy "profiles_select" on profiles for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "profiles_all" on profiles for all using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor') or is_super_admin()
);

-- lenses
create policy "lenses_select" on lenses for select using (
  scope = 'system'
  or is_workspace_member(workspace_id)
  or is_assigned_operator(workspace_id)
  or is_super_admin()
);
create policy "lenses_insert" on lenses for insert with check (
  (scope = 'workspace' and workspace_role_for(workspace_id) in ('owner', 'admin', 'editor'))
  or (scope = 'system' and is_operator())
);
create policy "lenses_update" on lenses for update using (
  (scope = 'workspace' and workspace_role_for(workspace_id) in ('owner', 'admin'))
  or (scope = 'system' and is_operator())
);

-- captures
create policy "captures_select" on captures for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "captures_insert" on captures for insert with check (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
);
create policy "captures_update" on captures for update using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);

-- generations (read only for clients)
create policy "generations_select" on generations for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);

-- campaigns
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

-- outputs
create policy "outputs_select" on outputs for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "outputs_update" on outputs for update using (
  workspace_role_for(workspace_id) in ('owner', 'admin', 'editor')
  or is_assigned_operator(workspace_id) or is_super_admin()
);

-- output_versions: insert-only for editors+
create policy "output_versions_select" on output_versions for select using (
  exists (
    select 1 from outputs o
    where o.id = output_id
    and (is_workspace_member(o.workspace_id) or is_assigned_operator(o.workspace_id) or is_super_admin())
  )
);
create policy "output_versions_insert" on output_versions for insert with check (
  exists (
    select 1 from outputs o
    where o.id = output_id
    and workspace_role_for(o.workspace_id) in ('owner', 'admin', 'editor')
  )
);

-- channels
create policy "channels_select" on channels for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "channels_all" on channels for all using (
  workspace_role_for(workspace_id) in ('owner', 'admin') or is_super_admin()
);

-- jobs, usage_events, audit_logs: server writes only (service role), clients read
create policy "jobs_select" on jobs for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "usage_events_select" on usage_events for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);
create policy "audit_logs_select" on audit_logs for select using (
  is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin()
);

-- ============================================================
-- CLOUT PRIVATE — Schema additions
-- ============================================================

-- captures: private flag and life-section tags
alter table captures
  add column if not exists is_private boolean not null default false,
  add column if not exists tags text[] not null default '{}';

create index if not exists captures_private_idx
  on captures(workspace_id, created_by, is_private)
  where deleted_at is null;
create index if not exists captures_tags_idx on captures using gin(tags);

-- profiles: operator visibility preference for private feed
alter table profiles
  add column if not exists private_feed_operator_visible boolean not null default false;

-- private_enrichments: AI-enriched versions of private captures (append-only)
create table if not exists private_enrichments (
  id              uuid primary key default gen_random_uuid(),
  capture_id      uuid not null references captures(id) on delete cascade,
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  lens_id         uuid references lenses(id) on delete set null,
  content         text not null,
  insights        jsonb not null default '[]',
  model           text not null,
  prompt_snapshot text,
  created_at      timestamptz not null default now()
);
create index if not exists private_enrichments_capture_idx
  on private_enrichments(capture_id);
create index if not exists private_enrichments_workspace_idx
  on private_enrichments(workspace_id);

alter table private_enrichments enable row level security;

-- Updated captures RLS: private captures visible only to creator
-- (and optionally to operators if private_feed_operator_visible = true)
drop policy if exists "captures_select" on captures;
create policy "captures_select" on captures for select using (
  (not is_private and (
    is_workspace_member(workspace_id)
    or is_assigned_operator(workspace_id)
    or is_super_admin()
  ))
  or
  (is_private and (
    created_by = auth_user_id()
    or is_super_admin()
    or (
      is_assigned_operator(workspace_id)
      and exists (
        select 1 from profiles p
        where p.workspace_id = captures.workspace_id
        and p.private_feed_operator_visible = true
      )
    )
  ))
);

-- private_enrichments RLS: mirrors private capture visibility
create policy "private_enrichments_select" on private_enrichments for select using (
  exists (
    select 1 from captures c
    where c.id = capture_id
    and (
      c.created_by = auth_user_id()
      or is_super_admin()
      or (
        is_assigned_operator(private_enrichments.workspace_id)
        and exists (
          select 1 from profiles p
          where p.workspace_id = private_enrichments.workspace_id
          and p.private_feed_operator_visible = true
        )
      )
    )
  )
);

-- onboarding_generations
create policy "onboarding_gen_select" on onboarding_generations for select
  using (is_workspace_member(workspace_id));
create policy "onboarding_gen_write" on onboarding_generations for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- System lens seed: Extract the Gold
insert into lenses (scope, name, description, system_prompt, tags, is_active)
select
  'system',
  'Extract the Gold',
  'Surfaces the deepest insight from a raw private thought using the user''s own mental models.',
  'You are a personal insight coach. The user has shared a raw, private thought. Using their stated mental models and philosophies as a lens, surface the single most valuable insight hidden in this thought. Write it as a rich, personal reflection — not a summary. Speak to them directly.',
  ARRAY['private', 'reflection'],
  true
where not exists (
  select 1 from lenses where name = 'Extract the Gold' and scope = 'system'
);


-- ─────────────────────────────────────────
-- Assistant Tables
-- ─────────────────────────────────────────

create table if not exists assistant_sessions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  capture_id   uuid references captures(id) on delete set null,
  user_id      uuid references users(id) on delete set null,
  status       text not null default 'active',
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index on assistant_sessions (workspace_id);
create index on assistant_sessions (capture_id);

alter table assistant_sessions enable row level security;

create policy "assistant_sessions_select" on assistant_sessions
  for select using (is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin());
create policy "assistant_sessions_insert" on assistant_sessions
  for insert with check (is_workspace_member(workspace_id));
create policy "assistant_sessions_update" on assistant_sessions
  for update using (is_workspace_member(workspace_id));


create table if not exists assistant_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references assistant_sessions(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role         text not null,
  content      text not null,
  model        text,
  tokens_used  int,
  created_at   timestamptz not null default now()
);

create index on assistant_messages (session_id);

alter table assistant_messages enable row level security;

create policy "assistant_messages_select" on assistant_messages
  for select using (is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin());
create policy "assistant_messages_insert" on assistant_messages
  for insert with check (is_workspace_member(workspace_id));


-- status lifecycle: queued -> inferring -> planning -> generating -> streaming -> persisting -> completed | failed | cancelled | retrying
create table if not exists assistant_generations (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references assistant_sessions(id) on delete cascade,
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  output_id            uuid references outputs(id) on delete set null,
  parent_generation_id uuid references assistant_generations(id) on delete set null,
  status               text not null default 'queued',
  inferred_intent      jsonb,
  output_format        text,
  provider             text,
  model                text,
  prompt_version       text,
  generation_config    jsonb,
  retry_count          int not null default 0,
  failure_reason       text,
  latency_ms           int,
  tokens_input         int,
  tokens_output        int,
  stream_state         text,
  created_at           timestamptz not null default now(),
  completed_at         timestamptz
);

create index on assistant_generations (session_id);
create index on assistant_generations (parent_generation_id);

alter table assistant_generations enable row level security;

create policy "assistant_generations_select" on assistant_generations
  for select using (is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin());
create policy "assistant_generations_insert" on assistant_generations
  for insert with check (is_workspace_member(workspace_id));
create policy "assistant_generations_update" on assistant_generations
  for update using (is_workspace_member(workspace_id));


-- Event ledger for observability, replayability, and future agent workflows
-- event_type values: intent_inferred | generation_started | generation_streaming |
--   generation_completed | generation_failed | revision_requested | output_saved |
--   output_published | retry_started | retry_completed | stream_disconnected | stream_resumed
create table if not exists assistant_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  session_id    uuid references assistant_sessions(id) on delete cascade,
  generation_id uuid references assistant_generations(id) on delete set null,
  event_type    text not null,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index on assistant_events (session_id);
create index on assistant_events (generation_id);
create index on assistant_events (workspace_id, event_type);

alter table assistant_events enable row level security;

create policy "assistant_events_select" on assistant_events
  for select using (is_workspace_member(workspace_id) or is_assigned_operator(workspace_id) or is_super_admin());
create policy "assistant_events_insert" on assistant_events
  for insert with check (is_workspace_member(workspace_id));


-- ─── Visual Generation Sessions ────────────────────────────────────────────────
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

-- Sessions are versioned and append-only; deactivate with is_active=false, never hard-delete
create policy "sessions are not deletable by users"
  on visual_generation_sessions for delete
  using (false);

-- Global content cache: each competitor domain scraped once, shared across workspaces
create table if not exists competitor_content_global (
  id                uuid primary key default gen_random_uuid(),
  competitor_domain text not null,
  source_type       text not null check (source_type in (
    'blog', 'youtube', 'twitter', 'linkedin', 'instagram', 'facebook'
  )),
  external_id       text not null,
  title             text,
  content           text,
  summary           text,
  url               text not null,
  thumbnail_url     text,
  published_at      timestamptz,
  fetched_at        timestamptz not null default now(),
  metrics           jsonb not null default '{}',
  topics            jsonb not null default '[]',
  importance_score  numeric not null default 0,
  source_confidence text not null default 'high' check (source_confidence in ('high', 'medium', 'low')),
  unique (competitor_domain, source_type, external_id)
);

create index if not exists competitor_content_global_domain_published
  on competitor_content_global (competitor_domain, published_at desc);

create index if not exists competitor_content_global_importance
  on competitor_content_global (importance_score desc);

-- Lightweight workspace → global content mapping
create table if not exists workspace_competitor_content (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_id   uuid not null references competitor_content_global(id) on delete cascade,
  primary key (workspace_id, content_id)
);

create index if not exists workspace_competitor_content_workspace
  on workspace_competitor_content (workspace_id);
