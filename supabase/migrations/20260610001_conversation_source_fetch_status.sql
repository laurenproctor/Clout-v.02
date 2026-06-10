-- Conversation source fetch status feedback.
-- Tracks why an ingest produced no opportunities so the UI can explain it.

alter table conversation_sources
  add column if not exists fetch_status   text,
  add column if not exists fetch_item_count int;

-- Output content lineage: cross-posts reference their originating note.
alter table outputs
  add column if not exists source_output_id uuid references outputs(id);

create index if not exists outputs_source_output_id_idx on outputs (source_output_id)
  where source_output_id is not null;
