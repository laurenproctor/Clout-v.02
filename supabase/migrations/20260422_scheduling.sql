-- supabase/migrations/20260422_scheduling.sql

-- 1. Add 'queued' to output_status enum
alter type output_status add value if not exists 'queued' after 'approved';

-- 2. Add scheduled_at to outputs
alter table outputs
  add column if not exists scheduled_at timestamptz;

create index if not exists outputs_workspace_scheduled_idx
  on outputs (workspace_id, scheduled_at)
  where deleted_at is null;

-- 3. Scheduling preferences (one row per workspace)
create table if not exists scheduling_preferences (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  posts_per_week   int not null default 3 check (posts_per_week between 1 and 14),
  preferred_days   int[] not null default '{1,3,5}',   -- ISO weekday: 1=Mon … 7=Sun
  preferred_times  text[] not null default '{"09:00","12:00","17:00"}',  -- HH:MM
  timezone         text not null default 'America/New_York',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (workspace_id)
);

create index if not exists scheduling_preferences_workspace_idx
  on scheduling_preferences (workspace_id);
