-- supabase/migrations/20260625000_visual_assets_auto_purpose_idempotency.sql
-- Server-enforced idempotency for auto-generated visual assets (e.g. the
-- "LinkedIn Image Post" auto image).
--
-- Selecting Image Post auto-generates one branded image once the post is saved.
-- That trigger can fire more than once (component remount, multiple tabs, a slow
-- preview-assets fetch that loses the "does a visual already exist?" race), and a
-- client-side guard alone is not race-safe — two concurrent requests can both miss
-- and both generate. A partial unique index makes the database the arbiter: the
-- second insert fails (23505), and the route re-queries and returns the existing
-- asset instead of persisting a duplicate.
--
-- Scoped to rows that actually carry a purpose tag (auto flows only). Manual
-- visual generation (no purpose) and every other visual_assets row are unaffected,
-- so manual regeneration still creates distinct assets.

create unique index if not exists visual_assets_auto_purpose_unique
on visual_assets (
  workspace_id,
  output_id,
  ((generation_context->>'purpose'))
)
where output_id is not null
  and generation_context ? 'purpose'
  and (generation_context->>'purpose') is not null;
