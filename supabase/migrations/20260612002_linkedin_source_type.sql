-- Add 'linkedin' source type
alter table conversation_sources
  drop constraint if exists conversation_sources_source_type_check;
alter table conversation_sources
  add constraint conversation_sources_source_type_check
  check (source_type in ('substack', 'substack_notes', 'rss', 'generic', 'reddit', 'linkedin'));
