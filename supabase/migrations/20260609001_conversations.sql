-- supabase/migrations/20260609001_conversations.sql

-- conversation_sources: RSS feeds, Substack pubs, and generic URLs a workspace monitors
create table conversation_sources (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references workspaces(id) on delete cascade,
  source_type              text not null check (source_type in ('substack', 'rss', 'generic')),
  source_url               text not null,
  title                    text,
  author                   text,
  active                   boolean not null default true,
  authority_score          integer not null default 50 check (authority_score between 0 and 100),
  last_fetched_at          timestamptz,
  last_successful_fetch_at timestamptz,  -- last fetch that returned ≥1 item
  last_error_at            timestamptz,  -- last fetch that threw an exception
  consecutive_failures     integer not null default 0,  -- resets to 0 on any success
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- conversation_followed_authors: named thought leaders to track across sources
create table conversation_followed_authors (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  url          text,           -- author profile or homepage URL
  publication  text,           -- publication they primarily write for
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- conversation_followed_publications: named publications (resolved to sources)
create table conversation_followed_publications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  url          text not null,
  rss_url      text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- conversation_items: content retrieved from sources, deduplicated by canonical_url
create table conversation_items (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references conversation_sources(id) on delete cascade,
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  external_id    text not null,
  content_hash   text,             -- SHA-256 of canonical_url for dedup across sources
  canonical_url  text,             -- normalized URL (no tracking params)
  content_type   text not null check (content_type in ('article', 'note', 'post')),
  title          text,
  author         text,
  author_url     text,
  publication    text,
  source_url     text not null,
  excerpt        text,             -- first 300 chars of body
  body_markdown  text,             -- full content as markdown (from Jina/scraper)
  body_html      text,             -- raw HTML (if available)
  hero_image     text,
  summary        text,             -- AI-generated 2-3 sentence summary
  published_at   timestamptz,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (source_id, external_id)
);

-- Prevent same article (by canonical URL) from being analyzed twice per workspace
-- even when it appears via multiple sources (RSS + followed pub + Substack feed variant)
create unique index conv_items_canonical_unique_idx
  on conversation_items(workspace_id, canonical_url)
  where canonical_url is not null;

-- conversation_themes: cross-source trend clusters detected by AI, deduped by content_hash
create table conversation_themes (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  title             text not null,
  summary           text not null,
  theme_score       integer not null check (theme_score between 0 and 100),
  content_hash      text,              -- SHA-256 of normalized(workspace_id+title) for dedup
  first_detected_at timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  theme_status      text not null default 'active'
                      check (theme_status in ('active', 'cooling', 'archived')),
  -- theme_status lifecycle: active -> cooling (14d since last_seen_at) -> archived (45d)
  -- active = user-manual disable; theme_status = system aging
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (workspace_id, content_hash)
);

-- conversation_theme_items: junction between themes and items
create table conversation_theme_items (
  theme_id uuid not null references conversation_themes(id) on delete cascade,
  item_id  uuid not null references conversation_items(id) on delete cascade,
  primary key (theme_id, item_id)
);

-- conversation_opportunities: AI-detected participation opportunities per item
create table conversation_opportunities (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  item_id           uuid not null references conversation_items(id) on delete cascade,
  theme_id          uuid references conversation_themes(id) on delete set null,
  opportunity_type  text not null check (opportunity_type in (
    'comment', 'note', 'post', 'framework', 'narrative',
    'question', 'counterpoint', 'agreement'
  )),
  title             text not null,
  explanation       text not null,
  why_this_matters  text,              -- cross-source context: why this conversation matters now
  relevance_score   integer not null check (relevance_score between 0 and 100),
  timeliness_score  integer not null check (timeliness_score between 0 and 100),
  uniqueness_score  integer not null check (uniqueness_score between 0 and 100),
  opportunity_score integer not null check (opportunity_score between 0 and 100),
  authority_score   integer not null default 50 check (authority_score between 0 and 100),
  overall_score     integer not null check (overall_score between 0 and 100),
  status            text not null default 'active'
                      check (status in ('active', 'saved', 'drafted', 'published', 'dismissed', 'suppressed')),
  suppressed_reason text,              -- set when status='suppressed', e.g. 'same_theme_type_week'
  generated_at      timestamptz not null default now(),
  unique (item_id, opportunity_type)
);

-- conversation_responses: generated drafts linked to opportunities
create table conversation_responses (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  opportunity_id      uuid not null references conversation_opportunities(id) on delete cascade,
  response_type       text not null,
  content             text not null,
  status              text not null default 'draft'
                        check (status in ('draft', 'published', 'discarded')),
  published_channel   text,              -- e.g. 'linkedin', 'substack', 'twitter'
  published_url       text,              -- link to the published comment/post
  published_at        timestamptz,       -- when the user marked it as published
  model               text,              -- AI model used for generation
  generation_metadata jsonb,             -- prompt version, theme snapshot, item snapshot
  created_at          timestamptz not null default now()
);

-- Indexes
create index conv_sources_workspace_idx   on conversation_sources(workspace_id);
create index conv_sources_active_idx      on conversation_sources(workspace_id, active);
create index conv_items_source_idx        on conversation_items(source_id);
create index conv_items_workspace_idx     on conversation_items(workspace_id);
create index conv_items_hash_idx          on conversation_items(content_hash) where content_hash is not null;
create index conv_items_canonical_idx     on conversation_items(workspace_id, canonical_url) where canonical_url is not null;
create index conv_items_published_idx     on conversation_items(workspace_id, published_at desc);
create index conv_themes_workspace_idx    on conversation_themes(workspace_id, active);
create index conv_themes_last_seen_idx    on conversation_themes(workspace_id, last_seen_at desc);
create index conv_themes_status_idx       on conversation_themes(workspace_id, theme_status);
create index conv_opps_workspace_idx      on conversation_opportunities(workspace_id);
create index conv_opps_item_idx           on conversation_opportunities(item_id);
create index conv_opps_status_idx         on conversation_opportunities(workspace_id, status);
create index conv_opps_overall_idx        on conversation_opportunities(workspace_id, overall_score desc);
create index conv_responses_opp_idx       on conversation_responses(opportunity_id);
create index conv_responses_workspace_idx on conversation_responses(workspace_id, created_at desc);
create index conv_authors_workspace_idx   on conversation_followed_authors(workspace_id);
create index conv_pubs_workspace_idx      on conversation_followed_publications(workspace_id);

-- RLS
alter table conversation_sources               enable row level security;
alter table conversation_followed_authors      enable row level security;
alter table conversation_followed_publications enable row level security;
alter table conversation_items                 enable row level security;
alter table conversation_themes                enable row level security;
alter table conversation_theme_items           enable row level security;
alter table conversation_opportunities         enable row level security;
alter table conversation_responses             enable row level security;

create policy "conv_sources_select" on conversation_sources for select using (is_workspace_member(workspace_id));
create policy "conv_sources_insert" on conversation_sources for insert with check (is_workspace_member(workspace_id));
create policy "conv_sources_update" on conversation_sources for update using (is_workspace_member(workspace_id));
create policy "conv_sources_delete" on conversation_sources for delete using (is_workspace_member(workspace_id));

create policy "conv_authors_select" on conversation_followed_authors for select using (is_workspace_member(workspace_id));
create policy "conv_authors_insert" on conversation_followed_authors for insert with check (is_workspace_member(workspace_id));
create policy "conv_authors_update" on conversation_followed_authors for update using (is_workspace_member(workspace_id));
create policy "conv_authors_delete" on conversation_followed_authors for delete using (is_workspace_member(workspace_id));

create policy "conv_pubs_select" on conversation_followed_publications for select using (is_workspace_member(workspace_id));
create policy "conv_pubs_insert" on conversation_followed_publications for insert with check (is_workspace_member(workspace_id));
create policy "conv_pubs_update" on conversation_followed_publications for update using (is_workspace_member(workspace_id));
create policy "conv_pubs_delete" on conversation_followed_publications for delete using (is_workspace_member(workspace_id));

create policy "conv_items_select" on conversation_items for select using (is_workspace_member(workspace_id));

create policy "conv_themes_select" on conversation_themes for select using (is_workspace_member(workspace_id));

create policy "conv_theme_items_select" on conversation_theme_items
  for select using (
    exists (select 1 from conversation_themes t where t.id = theme_id and is_workspace_member(t.workspace_id))
  );

create policy "conv_opps_select" on conversation_opportunities for select using (is_workspace_member(workspace_id));
create policy "conv_opps_update" on conversation_opportunities for update using (is_workspace_member(workspace_id));

create policy "conv_responses_select" on conversation_responses for select using (is_workspace_member(workspace_id));
create policy "conv_responses_insert" on conversation_responses for insert with check (is_workspace_member(workspace_id));
create policy "conv_responses_update" on conversation_responses for update using (is_workspace_member(workspace_id));
