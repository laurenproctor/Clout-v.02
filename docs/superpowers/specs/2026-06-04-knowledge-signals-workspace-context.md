# Knowledge Signals — Workspace-Contextual Generation

**Date:** 2026-06-04  
**Status:** Approved

## Problem

The Knowledge Signals tab in `/feed` currently returns the same hardcoded demo topics (marketing-focused) for every workspace, regardless of their industry, services, or post history. Topics should reflect what *this* workspace actually does and needs to know.

## Goal

Replace static demo data with AI-generated topics derived from workspace context, cached per-workspace, and refreshed when context changes or weekly.

---

## Data Layer

### Migration

```sql
alter table workspace_feed_settings
  add column if not exists knowledge_signals_cache jsonb;
```

### Cache shape (stored in `knowledge_signals_cache`)

```ts
{
  topics: KnowledgeTopic[],
  generated_at: string,   // ISO 8601 timestamp
  context_hash: string    // stable hash of (services + content_topics + brand_name)
}
```

### Cache freshness rules

A cached result is used as-is when **both** conditions hold:
- `generated_at` is within the last 7 days
- `context_hash` matches the hash of the current workspace settings

Either condition failing triggers regeneration.

---

## Context Inputs

Fetched in parallel on every request:

1. **`workspace_feed_settings`** — `services[]`, `content_topics[]`, `brand_name`
2. **`outputs`** — last 25 rows where `workspace_id` matches and `status IN ('published', 'approved')`, ordered by `created_at desc`, selecting `title` only

Post titles are the primary signal for inferring the workspace's field/niche, covering cases where `services` and `content_topics` are sparse or empty.

---

## AI Prompt Design

**Model:** `claude-sonnet-4-6`

**Prompt intent:**
> You are a knowledge curator for a professional content creator. Given their brand, services, topics, and recent post titles, generate 8–12 knowledge topics they should understand and be able to write about authoritatively in their field.

**Category distribution target:**
- Foundational: 2–3
- Advanced: 2–3
- Emerging: 1–2
- Debates: 1–2
- Thinkers: 1

**Output format:** JSON array of `KnowledgeTopic` objects matching the existing type exactly (id, title, category, importance_score, importance_level, status, summary, frameworks, thinkers, debates, related_topics, recommended_reading, content_angles, and optional fields).

**Validation:** Parse response as JSON; validate that each item has at minimum `id`, `title`, `category`, `summary`, and `content_angles`. Malformed or missing fields cause fallback.

---

## API Route Flow

`GET /api/knowledge-signals`

1. Auth check → 401 if no session
2. Parallel fetch: `workspace_feed_settings` + last 25 published output titles
3. Compute `context_hash` from current `services + content_topics + brand_name`
4. **Cache hit**: if `generated_at` < 7 days ago AND `context_hash` matches → return cached topics
5. **Cache miss**: call Claude → parse + validate JSON → write `knowledge_signals_cache` back to `workspace_feed_settings` → return topics
6. **Error fallback**: if Claude fails or returns unparseable JSON → return `DEMO_TOPICS` without writing to cache
7. **No settings row**: fall back to `DEMO_TOPICS`

---

## Files Touched

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_knowledge_signals_cache.sql` | Add `knowledge_signals_cache` column |
| `app/api/knowledge-signals/route.ts` | Replace demo return with cache-check + Claude generation |
| `lib/knowledge/demo-data.ts` | No change — kept as fallback |
| `lib/knowledge/generate.ts` | New: Claude prompt builder + response parser |

---

## Out of Scope

- Per-topic editing or manual curation (future)
- Knowledge graph visualization (already noted as future in code)
- Cross-linking to Industry Signals or Website Intelligence tabs (already noted as future in code)
- Forced manual refresh UI (can be added later; weekly + settings-change coverage is sufficient for now)
