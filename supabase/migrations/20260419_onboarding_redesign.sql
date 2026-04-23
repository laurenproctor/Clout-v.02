-- ============================================================
-- MIGRATION: Onboarding Redesign
-- Date: 2026-04-19
-- Description: Add new profile columns and onboarding_generations table
-- ============================================================

-- Add new columns to profiles
alter table profiles
  add column if not exists purpose text,
  add column if not exists role text,
  add column if not exists industry text,
  add column if not exists expertise text,
  add column if not exists profile_insights jsonb,
  add column if not exists channels text[] default '{}',
  add column if not exists audience_targets text[] default '{}',
  add column if not exists audience_perception text[] default '{}',
  add column if not exists onboarding_completed_at timestamptz;

-- Create onboarding_generations table
create table if not exists onboarding_generations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  positioning   text,
  post_ideas    jsonb not null default '[]',
  draft_post    text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

create unique index if not exists onboarding_generations_workspace_idx
  on onboarding_generations(workspace_id);

alter table onboarding_generations enable row level security;

drop policy if exists "workspace members can read own generation" on onboarding_generations;
drop policy if exists "service role can manage onboarding_generations" on onboarding_generations;
drop policy if exists "onboarding_gen_select" on onboarding_generations;
drop policy if exists "onboarding_gen_write" on onboarding_generations;
create policy "onboarding_gen_select" on onboarding_generations for select
  using (is_workspace_member(workspace_id));
create policy "onboarding_gen_write" on onboarding_generations for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
