-- supabase/migrations/20260515000_analytics_intelligence.sql

-- OAuth tokens for GA4 + GSC (one row per provider per workspace)
create table analytics_connections (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  provider        text not null check (provider in ('ga4', 'gsc')),
  access_token    text not null,
  refresh_token   text,
  expires_at      bigint,
  connected_by    uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, provider)
);
create index analytics_connections_workspace_idx on analytics_connections(workspace_id);

-- Selected GA4 properties and GSC sites per workspace
create table analytics_properties (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  property_type   text not null check (property_type in ('ga4_property', 'gsc_site')),
  property_id     text not null,
  property_name   text,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  unique (workspace_id, property_type)
);
create index analytics_properties_workspace_idx on analytics_properties(workspace_id);

-- UTM attribution per published output
-- strategic_intent: the goal the creator had for this piece of content.
-- Without this, the system cannot properly evaluate success.
create table content_attribution (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  output_id            uuid not null references outputs(id) on delete cascade,
  canonical_content_id text,
  platform             text not null,
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  lens_id              uuid references lenses(id) on delete set null,
  narrative_type       text,
  strategic_intent     text check (strategic_intent in (
    'educate', 'generate_leads', 'drive_discussion', 'build_authority',
    'increase_subscribers', 'recruit_talent', 'convert_sales', 'brand_awareness'
  )),
  created_at           timestamptz not null default now(),
  unique (output_id)
);
create index content_attribution_workspace_idx on content_attribution(workspace_id);
create index content_attribution_campaign_idx on content_attribution(utm_campaign) where utm_campaign is not null;

-- GA4 sessions + conversions data (daily rows keyed by UTM params)
-- DEDUPLICATION NOTE: Postgres cannot target expression indexes (coalesce()) via
-- ON CONFLICT column lists. Solution: use GENERATED ALWAYS AS stored columns
-- for normalized (null-coalesced) versions, then build unique index and upsert
-- on those columns directly.
create table analytics_events (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  property_id             text not null,
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  utm_content             text,
  landing_page            text,
  session_count           integer not null default 0,
  engaged_sessions        integer not null default 0,
  avg_engagement_time     numeric,
  conversions             integer not null default 0,
  conversion_type         text,
  revenue                 numeric,
  event_date              date not null,
  synced_at               timestamptz not null default now(),
  utm_source_n            text generated always as (coalesce(utm_source, '')) stored,
  utm_medium_n            text generated always as (coalesce(utm_medium, '')) stored,
  utm_campaign_n          text generated always as (coalesce(utm_campaign, '')) stored,
  utm_content_n           text generated always as (coalesce(utm_content, '')) stored
);
create unique index analytics_events_unique_idx on analytics_events (
  workspace_id, property_id, utm_source_n, utm_medium_n, utm_campaign_n, utm_content_n, event_date
);
create index analytics_events_workspace_date_idx on analytics_events(workspace_id, event_date desc);
create index analytics_events_campaign_idx on analytics_events(workspace_id, utm_campaign_n) where utm_campaign_n != '';

-- Search Console query + page data (daily)
create table search_console_metrics (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  site_url        text not null,
  query           text not null,
  landing_page    text not null,
  clicks          integer not null default 0,
  impressions     integer not null default 0,
  ctr             numeric,
  avg_position    numeric,
  recorded_at     date not null,
  created_at      timestamptz not null default now()
);
create unique index search_console_unique_idx on search_console_metrics (
  workspace_id, site_url, query, landing_page, recorded_at
);
create index search_console_workspace_date_idx on search_console_metrics(workspace_id, recorded_at desc);
create index search_console_query_idx on search_console_metrics(workspace_id, query);

-- Narrative type performance rollups (snapshot rows — never upsert, always insert)
-- One row per workspace+narrative+date allows longitudinal analysis of decay/growth.
create table narrative_performance (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  narrative_type        text not null,
  avg_engagement_rate   numeric,
  avg_conversion_rate   numeric,
  avg_session_duration  numeric,
  sample_size           integer not null default 0,
  computed_for_date     date not null default current_date,
  computed_at           timestamptz not null default now(),
  unique (workspace_id, narrative_type, computed_for_date)
);
create index narrative_performance_workspace_idx on narrative_performance(workspace_id, computed_for_date desc);

-- Lens performance rollups (snapshot rows — never upsert, always insert)
-- One row per workspace+lens+date preserves history for trend/decay analysis.
create table lens_performance (
  id                         uuid primary key default gen_random_uuid(),
  workspace_id               uuid not null references workspaces(id) on delete cascade,
  lens_id                    uuid not null references lenses(id) on delete cascade,
  avg_traffic                numeric,
  avg_conversion_rate        numeric,
  avg_assisted_conversions   numeric,
  authority_score            numeric,
  resonance_score            numeric,
  computed_for_date          date not null default current_date,
  computed_at                timestamptz not null default now(),
  unique (workspace_id, lens_id, computed_for_date)
);
create index lens_performance_workspace_idx on lens_performance(workspace_id, computed_for_date desc);

-- RLS: enable on all analytics tables. Service role bypasses RLS automatically.
-- These policies deny all anon/authenticated Supabase-auth access — defense in depth.
alter table analytics_connections    enable row level security;
alter table analytics_properties     enable row level security;
alter table content_attribution      enable row level security;
alter table analytics_events         enable row level security;
alter table search_console_metrics   enable row level security;
alter table narrative_performance    enable row level security;
alter table lens_performance         enable row level security;

-- No permissive policies added — service role (used by all server code) bypasses RLS.
-- Anon and authenticated Supabase-auth roles get no access by default.
