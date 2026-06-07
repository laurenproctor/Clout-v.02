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
  industry_summary: string,   // e.g. "Industry: Industrial Waste Management\nSubdomains: ..."
  topics: KnowledgeTopic[],
  generated_at: string,       // ISO 8601 timestamp
  context_hash: string        // hash of settings + recent post titles
}
```

The `industry_summary` is a reusable workspace intelligence artifact. It can later power Industry Signals, Website Intelligence, framework generation, and content recommendations without re-inferring the workspace on each request.

### Cache freshness rules

A cached result is used as-is when **both** conditions hold:
- `generated_at` is within the last 7 days
- `context_hash` matches the hash of the current workspace context

Either condition failing triggers regeneration.

### Context hash

The hash covers workspace settings **and** recent post titles so that new content published by the workspace invalidates the cache:

```ts
const recentTitlesSignature = sha256(recentTitles.join('|'))

const contextHash = sha256(
  JSON.stringify({ brand_name, services, content_topics, recentTitlesSignature })
)
```

---

## Context Inputs

Fetched in parallel on every request:

1. **`workspace_feed_settings`** — `services[]`, `content_topics[]`, `brand_name`, `knowledge_signals_cache`
2. **`outputs`** — last 50 rows where `workspace_id` matches and `status IN ('published', 'approved')`, ordered by `created_at desc`, selecting `title` only

Post titles are the primary signal for inferring the workspace's field/niche, covering cases where `services` and `content_topics` are sparse or empty.

### Low-context fallback

If the workspace lacks sufficient context to generate meaningful topics, return `DEMO_TOPICS` without calling Claude:

```ts
if (
  services.length === 0 &&
  contentTopics.length === 0 &&
  recentTitles.length < 5
) {
  return DEMO_TOPICS
}
```

---

## AI Prompt Design

**Model:** `claude-sonnet-4-6`

**Prompt intent:**
> You are a knowledge curator for a professional content creator. Given their brand, services, topics, and recent post titles, generate 8–12 knowledge topics they should understand and be able to write about authoritatively in their field.
>
> Generate topics specific to the workspace's actual industry and domain expertise. Do NOT generate generic creator, marketing, branding, social media, audience growth, content strategy, personal branding, or thought leadership topics unless those topics are core to the workspace's actual business. Prioritize industry knowledge, operational expertise, technical concepts, frameworks, trends, debates, and domain-specific thinking.
>
> Also return a short `industry_summary` string (2–5 lines) naming the workspace's inferred industry and key subdomains. This is stored and reused across features.

**Category distribution target:**
- Foundational: 2–3
- Advanced: 2–3
- Emerging: 1–2
- Debates: 1–2
- Thinkers: 1

**Output format:** JSON object with two keys:

- `industry_summary: string`
- `topics: KnowledgeTopic[]`

Each topic matches the existing `KnowledgeTopic` type. `thinkers` and `recommended_reading` are optional — Claude should only populate them when highly confident; empty arrays are acceptable. All other required fields must be present.

**Topic ID generation:** IDs are generated client-side from `slugify(title)` (e.g. `behavioral-health-design`), not by Claude. This ensures stable IDs across regenerations even if Claude slightly rephrases a title.

**Validation:** Parse response as JSON; validate that each item has at minimum `id`, `title`, `category`, `summary`, and `content_angles`. Malformed or missing fields cause fallback to `DEMO_TOPICS`.

---

## Post-Generation Processing

Before caching and returning topics, apply two passes:

### 1. ID assignment

```ts
topic.id = slugify(topic.title)
```

### 2. Deduplication
Remove topics whose `slugify(title)` matches an already-seen slug. For near-duplicates with the same root concept (e.g. "Supply Chain Resilience", "Supply Chain Risk", "Supply Chain Diversification"), Claude is instructed to emit only the most distinct version; the slug dedup catches exact/near-exact collisions as a safety net.

---

## API Route Flow

`GET /api/knowledge-signals`

1. Auth check → 401 if no session
2. Parallel fetch: `workspace_feed_settings` + last 50 published output titles
3. **Low-context check**: if `services.length === 0 && contentTopics.length === 0 && recentTitles.length < 5` → return `DEMO_TOPICS`
4. Compute `context_hash` from settings + recent titles signature
5. **Cache hit**: if `generated_at` < 7 days ago AND `context_hash` matches → return `{ topics, industry_summary }` from cache
6. **Cache miss**: call Claude → parse + validate JSON → assign IDs + deduplicate → write `knowledge_signals_cache` back to `workspace_feed_settings` → return topics
7. **Error fallback**: if Claude fails or returns unparseable JSON → return `DEMO_TOPICS` without writing to cache
8. **No settings row**: return `DEMO_TOPICS`

---

## Files Touched

| File | Change |
|------|--------|
| `supabase/migrations/20260604002_knowledge_signals_cache.sql` | Add `knowledge_signals_cache` column |
| `app/api/knowledge-signals/route.ts` | Replace demo return with full cache-check + generation flow |
| `lib/knowledge/generate.ts` | New: Claude prompt builder, response parser, ID assignment, deduplication |
| `lib/knowledge/demo-data.ts` | No change — kept as fallback |

---

## Out of Scope

- Per-topic editing or manual curation (future)
- Knowledge graph visualization (already noted as future in code)
- Cross-linking to Industry Signals or Website Intelligence tabs (already noted as future in code)
- Forced manual refresh UI (future; weekly + context-change coverage is sufficient for now)
- Exposing `industry_summary` in the UI (future; stored now for reuse across features)
