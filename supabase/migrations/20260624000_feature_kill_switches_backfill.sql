-- Backfill: feature_kill_switches was the one object from 20260612006_linkedin_beta_gates
-- that never made it to the remote DB (006 was hand-applied piecemeal; its other objects
-- exist, and re-running 006 wholesale would collide on its non-idempotent create-policy
-- statements). This recovers just that table, idempotently.
create table if not exists feature_kill_switches (
  key        text primary key,
  disabled   boolean not null default false,
  reason     text,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table feature_kill_switches enable row level security;

insert into feature_kill_switches (key, disabled, reason)
  values ('unipile', false, 'initial seed — connector enabled')
  on conflict (key) do nothing;
