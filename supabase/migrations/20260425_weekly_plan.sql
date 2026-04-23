-- supabase/migrations/20260425_weekly_plan.sql

-- 1. Outputs: track weekly plan inclusion
alter table outputs
  add column if not exists approved_for_week    boolean not null default false,
  add column if not exists week_bucket          date,
  add column if not exists performance_snapshot jsonb;

-- 2. Scheduling preferences: weekly digest settings
alter table scheduling_preferences
  add column if not exists weekly_digest_enabled boolean not null default true,
  add column if not exists weekly_digest_day     smallint default 1,  -- 1=Monday
  add column if not exists weekly_digest_hour    smallint default 8;  -- 8am workspace tz
