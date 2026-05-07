-- supabase/migrations/20260506_weekly_plan.sql
-- Phase 2C: Weekly approval loop — ensures columns exist (idempotent)

alter table outputs
  add column if not exists approved_for_week boolean not null default false,
  add column if not exists week_bucket       date,
  add column if not exists performance_snapshot jsonb;

alter table scheduling_preferences
  add column if not exists weekly_digest_enabled boolean not null default true,
  add column if not exists weekly_digest_day     smallint default 1,
  add column if not exists weekly_digest_hour    smallint default 8;
