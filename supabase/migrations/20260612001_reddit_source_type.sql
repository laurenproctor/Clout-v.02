-- 1. Add 'reddit' source type
alter table conversation_sources
  drop constraint if exists conversation_sources_source_type_check;
alter table conversation_sources
  add constraint conversation_sources_source_type_check
  check (source_type in ('substack', 'substack_notes', 'rss', 'generic', 'reddit'));

-- 2. Add 'comment' content type (Reddit comments stored as independent conversation items)
alter table conversation_items
  drop constraint if exists conversation_items_content_type_check;
alter table conversation_items
  add constraint conversation_items_content_type_check
  check (content_type in ('article', 'note', 'post', 'comment'));

-- 3. Add 'pain_point' opportunity type
alter table conversation_opportunities
  drop constraint if exists conversation_opportunities_opportunity_type_check;
alter table conversation_opportunities
  add constraint conversation_opportunities_opportunity_type_check
  check (opportunity_type in (
    'comment', 'note', 'post', 'framework', 'narrative',
    'question', 'counterpoint', 'agreement', 'pain_point'
  ));
