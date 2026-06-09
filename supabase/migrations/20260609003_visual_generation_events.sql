-- Visual generation event telemetry.
-- Tracks internal quality signals (from the generation pipeline) and user
-- behavior signals (from UI actions: download, publish, regenerate, discard).
-- Quality signals are written at generation time; user signals are written later via PATCH.

create table if not exists visual_generation_events (
  id                    uuid primary key default gen_random_uuid(),
  image_id              uuid not null references visual_assets(id) on delete cascade,
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  created_at            timestamptz not null default now(),

  -- Internal quality signals
  template_id           text,
  quality_score         numeric(4, 3),          -- 0.000–1.000
  open_zone             text,                    -- 'bottom-left' | 'center' | 'right' | 'upper-left'
  open_zone_confidence  numeric(4, 3),
  logo_visibility_score numeric(4, 3),
  template_override_used boolean not null default false,
  logo_repositioned      boolean not null default false,
  quality_gate_triggered boolean not null default false,
  regeneration_requested boolean not null default false,
  rejection_reason       text,

  -- User behavior signals (nullable; written after user action)
  user_downloaded  boolean,
  user_published   boolean,
  user_regenerated boolean,
  user_discarded   boolean
);

create index visual_generation_events_workspace_idx on visual_generation_events (workspace_id, created_at desc);
create index visual_generation_events_image_idx     on visual_generation_events (image_id);

-- Row-level security: workspaces own their events
alter table visual_generation_events enable row level security;

create policy "workspace members can read their generation events"
  on visual_generation_events for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can insert generation events"
  on visual_generation_events for insert
  with check (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can update generation events"
  on visual_generation_events for update
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));
