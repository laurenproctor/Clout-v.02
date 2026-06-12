-- 1. New columns for keyword monitor sources
alter table conversation_sources
  add column if not exists provider text
    check (provider is null or provider in ('reddit', 'linkedin', 'substack', 'news')),
  add column if not exists keyword_query text,
  add column if not exists normalized_keyword text,
  add column if not exists config jsonb;

-- 2. Add 'keyword' to source type constraint
alter table conversation_sources
  drop constraint if exists conversation_sources_source_type_check;
alter table conversation_sources
  add constraint conversation_sources_source_type_check
  check (source_type in (
    'substack', 'substack_notes', 'rss', 'generic',
    'reddit', 'linkedin', 'keyword'
  ));

-- 3. Keyword rows must have all three keyword fields
alter table conversation_sources
  drop constraint if exists conversation_sources_keyword_fields_check;
alter table conversation_sources
  add constraint conversation_sources_keyword_fields_check
  check (
    source_type != 'keyword'
    or (
      provider is not null
      and keyword_query is not null
      and normalized_keyword is not null
    )
  );

-- 4. Deduplicate by business concept (workspace + provider + normalized keyword)
create unique index if not exists conversation_sources_keyword_unique_idx
  on conversation_sources (workspace_id, provider, normalized_keyword)
  where source_type = 'keyword';
