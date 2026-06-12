-- Provider identifiers for ingested items (LinkedIn-via-Unipile and future connectors).
-- Stored as explicit columns — not buried in metadata — so commenting, reacting,
-- deduping, and debugging can key off them reliably.

-- 1. Provider columns
alter table conversation_items
  add column if not exists provider          text,
  add column if not exists provider_item_id   text,  -- stable provider id (e.g. activity/ugcPost id)
  add column if not exists provider_social_id text,  -- Unipile social_id, required for engagement actions
  add column if not exists provider_url       text,
  add column if not exists provider_metadata  jsonb;

-- 2. Dedupe by provider social id when known (the reliable engagement key)
create unique index if not exists conv_items_provider_social_unique_idx
  on conversation_items (workspace_id, provider, provider_social_id)
  where provider_social_id is not null;

-- 3. Fall back to provider_item_id for dedupe when no social id is available
create unique index if not exists conv_items_provider_item_unique_idx
  on conversation_items (workspace_id, provider, provider_item_id)
  where provider_social_id is null and provider_item_id is not null;
