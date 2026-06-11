alter table visual_assets
  add column if not exists generation_context jsonb;
-- Future: add GIN index when querying against context fields becomes necessary
-- create index concurrently visual_assets_generation_context_gin on visual_assets using gin (generation_context);
