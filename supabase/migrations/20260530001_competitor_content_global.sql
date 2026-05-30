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
