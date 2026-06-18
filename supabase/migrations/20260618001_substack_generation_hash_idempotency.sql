-- supabase/migrations/20260618001_substack_generation_hash_idempotency.sql
-- Server-enforced idempotency for auto-saved Substack drafts.
--
-- The Substack Article creator auto-saves a Studio draft on generation-complete. That
-- event can fire more than once (stream retry, component remount, multiple tabs), and a
-- client-side guard alone is not race-safe — two concurrent requests can both pass a
-- "does it exist yet?" check and both insert. A partial unique index makes the database
-- the arbiter: the second insert fails, and the route re-queries and returns the existing
-- draft. A genuine regeneration changes content.sourceGenerationHash and still inserts.
--
-- Scoped to rows that actually carry the hash so existing/other substack-newsletter
-- outputs are unaffected.

create unique index if not exists outputs_substack_generation_hash_unique
on outputs (
  workspace_id,
  content_type,
  ((content->>'sourceCreator')),
  ((content->>'sourceGenerationHash'))
)
where content_type = 'substack-newsletter' and content ? 'sourceGenerationHash';
