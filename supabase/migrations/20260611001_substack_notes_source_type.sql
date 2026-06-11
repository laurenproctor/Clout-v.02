-- Extend source_type to allow 'substack_notes' for Notes-specific monitoring
alter table conversation_sources
  drop constraint if exists conversation_sources_source_type_check;

alter table conversation_sources
  add constraint conversation_sources_source_type_check
  check (source_type in ('substack', 'substack_notes', 'rss', 'generic'));

-- Prevent duplicate monitoring of the same URL+type combination per workspace
-- Allows: example.substack.com+substack and example.substack.com+substack_notes to coexist
create unique index if not exists conv_sources_workspace_url_type_idx
  on conversation_sources (workspace_id, source_url, source_type);
