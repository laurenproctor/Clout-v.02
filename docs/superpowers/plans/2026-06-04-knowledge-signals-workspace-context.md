# Knowledge Signals — Workspace-Contextual Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded demo knowledge topics with AI-generated topics derived from each workspace's services, content topics, and post history — cached per workspace and refreshed weekly or on context change.

**Architecture:** The route handler reads workspace settings + recent post titles from Supabase, checks a JSONB cache column on `workspace_feed_settings`, and calls Claude via the existing `callClaude` helper when the cache is stale or missing. All business logic lives in `lib/knowledge/generate.ts`; the route handler only authenticates, fetches, and writes.

**Tech Stack:** Vitest (unit tests), `callClaude` from `lib/ai/generate.ts` (Anthropic SDK wrapper), Node `crypto` (SHA-256 hashing), Supabase server client, `@anthropic-ai/sdk`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260604002_knowledge_signals_cache.sql` | Create | Add `knowledge_signals_cache` column |
| `supabase/schema.sql` | Modify | Document the new column inline |
| `lib/knowledge/generate.ts` | Create | All business logic: hashing, cache check, prompt, parse, ID assignment, deduplication, Claude call |
| `app/api/knowledge-signals/route.ts` | Modify | Replace demo return with cache-check + generation flow |
| `tests/knowledge/generate.test.ts` | Create | Unit tests for all pure functions |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260604002_knowledge_signals_cache.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260604002_knowledge_signals_cache.sql
alter table workspace_feed_settings
  add column if not exists knowledge_signals_cache jsonb;
```

- [ ] **Step 2: Document the column in schema.sql**

Find the `workspace_feed_settings` table in `supabase/schema.sql`. It currently looks like:

```sql
CREATE TABLE workspace_feed_settings (
  workspace_id    uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  content_topics  text[] DEFAULT '{}',
  services        text[] DEFAULT '{}',
  tone_preference tone_pref NOT NULL DEFAULT 'authoritative',
  brand_name      text DEFAULT '',
  competitors     text[] DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz
);
```

Add the new column:

```sql
CREATE TABLE workspace_feed_settings (
  workspace_id              uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  content_topics            text[] DEFAULT '{}',
  services                  text[] DEFAULT '{}',
  tone_preference           tone_pref NOT NULL DEFAULT 'authoritative',
  brand_name                text DEFAULT '',
  competitors               text[] DEFAULT '{}',
  knowledge_signals_cache   jsonb,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz
);
```

- [ ] **Step 3: Apply the migration**

Run in Supabase dashboard SQL editor, or via CLI:

```bash
npx supabase db push
```

Expected: No errors. The column `knowledge_signals_cache` now exists on `workspace_feed_settings`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604002_knowledge_signals_cache.sql supabase/schema.sql
git commit -m "feat: add knowledge_signals_cache column to workspace_feed_settings"
```

---

## Task 2: Write Failing Unit Tests

**Files:**
- Create: `tests/knowledge/generate.test.ts`

Write all tests before any implementation. They must fail at this stage because `lib/knowledge/generate.ts` does not exist yet.

- [ ] **Step 1: Create the test file**

```ts
// tests/knowledge/generate.test.ts
import { describe, it, expect } from 'vitest'
import {
  slugify,
  buildContextHash,
  isCacheFresh,
  hasEnoughContext,
  deduplicateTopics,
  parseGenerationResponse,
  buildUserMessage,
  type WorkspaceContext,
  type KnowledgeSignalsCache,
} from '@/lib/knowledge/generate'
import type { KnowledgeTopic } from '@/types/feed'

// ── slugify ────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Supply Chain Risk')).toBe('supply-chain-risk')
  })

  it('strips special characters', () => {
    expect(slugify('AI & Machine Learning')).toBe('ai-machine-learning')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('Trauma-Informed  Care')).toBe('trauma-informed-care')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })

  it('handles already-slugged strings', () => {
    expect(slugify('behavioral-health-design')).toBe('behavioral-health-design')
  })
})

// ── buildContextHash ───────────────────────────────────────────────────────

describe('buildContextHash', () => {
  const base: WorkspaceContext = {
    brand_name: 'Acme Corp',
    services: ['Consulting', 'Training'],
    content_topics: ['Leadership', 'Operations'],
    recent_titles: ['Post A', 'Post B'],
  }

  it('returns a 64-character hex string', () => {
    const hash = buildContextHash(base)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('same inputs produce the same hash', () => {
    expect(buildContextHash(base)).toBe(buildContextHash(base))
  })

  it('different brand_name produces different hash', () => {
    expect(buildContextHash({ ...base, brand_name: 'Other Co' })).not.toBe(buildContextHash(base))
  })

  it('different recent_titles produces different hash', () => {
    expect(buildContextHash({ ...base, recent_titles: ['New Post'] })).not.toBe(buildContextHash(base))
  })

  it('services order does not affect hash', () => {
    const reordered = { ...base, services: ['Training', 'Consulting'] }
    expect(buildContextHash(reordered)).toBe(buildContextHash(base))
  })

  it('content_topics order does not affect hash', () => {
    const reordered = { ...base, content_topics: ['Operations', 'Leadership'] }
    expect(buildContextHash(reordered)).toBe(buildContextHash(base))
  })
})

// ── isCacheFresh ───────────────────────────────────────────────────────────

describe('isCacheFresh', () => {
  const hash = 'abc123'

  const freshCache: KnowledgeSignalsCache = {
    industry_summary: 'Industry: Test',
    topics: [],
    generated_at: new Date().toISOString(),
    context_hash: hash,
  }

  it('returns true for a cache generated now with matching hash', () => {
    expect(isCacheFresh(freshCache, hash)).toBe(true)
  })

  it('returns false when context_hash differs', () => {
    expect(isCacheFresh(freshCache, 'different-hash')).toBe(false)
  })

  it('returns false when generated_at is more than 7 days ago', () => {
    const stale: KnowledgeSignalsCache = {
      ...freshCache,
      generated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(isCacheFresh(stale, hash)).toBe(false)
  })

  it('returns true when generated_at is exactly 6 days ago', () => {
    const slightlyOld: KnowledgeSignalsCache = {
      ...freshCache,
      generated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(isCacheFresh(slightlyOld, hash)).toBe(true)
  })
})

// ── hasEnoughContext ───────────────────────────────────────────────────────

describe('hasEnoughContext', () => {
  it('returns false when all fields are empty/sparse', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: [],
    })).toBe(false)
  })

  it('returns false when only brand_name is set (not enough signal)', () => {
    expect(hasEnoughContext({
      brand_name: 'Acme',
      services: [],
      content_topics: [],
      recent_titles: [],
    })).toBe(false)
  })

  it('returns true when services are present', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: ['Consulting'],
      content_topics: [],
      recent_titles: [],
    })).toBe(true)
  })

  it('returns true when content_topics are present', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: ['Leadership'],
      recent_titles: [],
    })).toBe(true)
  })

  it('returns true when recent_titles has 5 or more entries', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: ['A', 'B', 'C', 'D', 'E'],
    })).toBe(true)
  })

  it('returns false when recent_titles has fewer than 5 entries and no services/topics', () => {
    expect(hasEnoughContext({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: ['A', 'B', 'C', 'D'],
    })).toBe(false)
  })
})

// ── deduplicateTopics ──────────────────────────────────────────────────────

const makeTopic = (title: string): KnowledgeTopic => ({
  id: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  category: 'foundational',
  importance_score: 80,
  importance_level: 'important',
  status: 'core',
  summary: 'Test',
  frameworks: [],
  thinkers: [],
  debates: [],
  related_topics: [],
  recommended_reading: [],
  content_angles: ['Angle 1'],
})

describe('deduplicateTopics', () => {
  it('returns all topics when all are distinct', () => {
    const topics = [makeTopic('Topic A'), makeTopic('Topic B'), makeTopic('Topic C')]
    expect(deduplicateTopics(topics)).toHaveLength(3)
  })

  it('removes duplicate slugs', () => {
    const topics = [makeTopic('Topic A'), makeTopic('Topic A'), makeTopic('Topic B')]
    const result = deduplicateTopics(topics)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Topic A')
    expect(result[1].title).toBe('Topic B')
  })

  it('keeps the first occurrence of a duplicate', () => {
    const a1 = { ...makeTopic('Positioning'), importance_score: 90 }
    const a2 = { ...makeTopic('Positioning'), importance_score: 50 }
    const result = deduplicateTopics([a1, a2])
    expect(result[0].importance_score).toBe(90)
  })
})

// ── parseGenerationResponse ────────────────────────────────────────────────

describe('parseGenerationResponse', () => {
  const validTopic = {
    title: 'Supply Chain Risk',
    category: 'foundational',
    importance_score: 85,
    importance_level: 'important',
    status: 'core',
    summary: 'How companies manage disruptions.',
    frameworks: ['SCRM'],
    thinkers: [],
    debates: [],
    related_topics: [],
    recommended_reading: [],
    content_angles: ['Guide: What is supply chain risk?'],
  }

  const validResponse = JSON.stringify({
    industry_summary: 'Industry: Logistics\nSubdomains:\n- Supply Chain',
    topics: [validTopic],
  })

  it('parses a valid response', () => {
    const result = parseGenerationResponse(validResponse)
    expect(result).not.toBeNull()
    expect(result!.topics).toHaveLength(1)
    expect(result!.industry_summary).toContain('Logistics')
  })

  it('returns null for empty string', () => {
    expect(parseGenerationResponse('')).toBeNull()
  })

  it('returns null when topics array is missing', () => {
    expect(parseGenerationResponse(JSON.stringify({ industry_summary: 'Industry: X' }))).toBeNull()
  })

  it('filters out topics missing required fields', () => {
    const bad = { title: 'Missing fields' } // no category, summary, content_angles
    const response = JSON.stringify({
      industry_summary: 'Industry: X',
      topics: [bad, validTopic],
    })
    const result = parseGenerationResponse(response)
    expect(result!.topics).toHaveLength(1)
    expect(result!.topics[0].title).toBe('Supply Chain Risk')
  })

  it('returns null when all topics fail validation', () => {
    const response = JSON.stringify({
      industry_summary: 'Industry: X',
      topics: [{ title: 'Bad' }],
    })
    expect(parseGenerationResponse(response)).toBeNull()
  })

  it('handles JSON wrapped in markdown fences', () => {
    const fenced = '```json\n' + validResponse + '\n```'
    const result = parseGenerationResponse(fenced)
    expect(result).not.toBeNull()
    expect(result!.topics).toHaveLength(1)
  })
})

// ── buildUserMessage ───────────────────────────────────────────────────────

describe('buildUserMessage', () => {
  it('includes brand_name when set', () => {
    const msg = buildUserMessage({
      brand_name: 'Acme',
      services: [],
      content_topics: [],
      recent_titles: [],
    })
    expect(msg).toContain('Acme')
  })

  it('includes services when present', () => {
    const msg = buildUserMessage({
      brand_name: '',
      services: ['Hazardous Waste Management'],
      content_topics: [],
      recent_titles: [],
    })
    expect(msg).toContain('Hazardous Waste Management')
  })

  it('includes recent titles with numbering', () => {
    const msg = buildUserMessage({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: ['Post One', 'Post Two'],
    })
    expect(msg).toContain('1. Post One')
    expect(msg).toContain('2. Post Two')
  })

  it('omits empty sections', () => {
    const msg = buildUserMessage({
      brand_name: '',
      services: [],
      content_topics: [],
      recent_titles: [],
    })
    expect(msg.trim()).toBe('')
  })
})
```

- [ ] **Step 2: Run tests — verify they ALL fail with module-not-found errors**

```bash
npx vitest run tests/knowledge/generate.test.ts
```

Expected: All tests fail. Error like:
```
Cannot find module '@/lib/knowledge/generate'
```

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/knowledge/generate.test.ts
git commit -m "test: failing tests for knowledge signals generation utilities"
```

---

## Task 3: Implement Pure Functions in `lib/knowledge/generate.ts`

**Files:**
- Create: `lib/knowledge/generate.ts`

Implement only the pure/synchronous functions first. Do not implement `generateKnowledgeTopics` (the Claude call) yet.

- [ ] **Step 1: Create `lib/knowledge/generate.ts` with pure functions**

```ts
import { createHash } from 'crypto'
import { callClaude } from '@/lib/ai/generate'
import type { KnowledgeTopic } from '@/types/feed'

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkspaceContext {
  brand_name: string
  services: string[]
  content_topics: string[]
  recent_titles: string[]
}

export interface KnowledgeSignalsCache {
  industry_summary: string
  topics: KnowledgeTopic[]
  generated_at: string
  context_hash: string
}

// ── Utilities ──────────────────────────────────────────────────────────────

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildContextHash(ctx: WorkspaceContext): string {
  const titlesSignature = createHash('sha256')
    .update(ctx.recent_titles.join('|'))
    .digest('hex')

  const payload = JSON.stringify({
    brand_name: ctx.brand_name,
    services: ctx.services.slice().sort(),
    content_topics: ctx.content_topics.slice().sort(),
    recent_titles_signature: titlesSignature,
  })

  return createHash('sha256').update(payload).digest('hex')
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function isCacheFresh(cache: KnowledgeSignalsCache, currentHash: string): boolean {
  if (cache.context_hash !== currentHash) return false
  return Date.now() - new Date(cache.generated_at).getTime() < CACHE_TTL_MS
}

export function hasEnoughContext(ctx: WorkspaceContext): boolean {
  return (
    ctx.services.length > 0 ||
    ctx.content_topics.length > 0 ||
    ctx.recent_titles.length >= 5
  )
}

export function deduplicateTopics(topics: KnowledgeTopic[]): KnowledgeTopic[] {
  const seen = new Set<string>()
  return topics.filter(t => {
    const key = slugify(t.title)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Prompt builders ────────────────────────────────────────────────────────

export function buildSystemPrompt(): string {
  return `You are a knowledge curator for professional content creators and thought leaders.

Your job is to identify the most important knowledge domains a content creator should master and be able to write about authoritatively — given their business, services, and what they already post about.

Generate 8–12 knowledge topics across these categories:
- foundational (2–3): concepts everyone in the field must understand
- advanced (2–3): deeper frameworks, techniques, or debates for practitioners
- emerging (1–2): new ideas gaining traction, not yet mainstream
- debate (1–2): contested questions where smart people genuinely disagree
- thinker (1): a key voice or practitioner they should know

IMPORTANT RULES:
- Generate topics specific to the workspace's actual industry and domain expertise.
- Do NOT generate generic creator, marketing, branding, social media, audience growth, content strategy, personal branding, or thought leadership topics unless those topics are the workspace's actual business (e.g. a marketing agency).
- Prioritize industry knowledge, operational expertise, technical concepts, frameworks, trends, debates, and domain-specific thinking.
- For thinkers and recommended_reading: only include if you are highly confident they are real and directly relevant. Empty arrays are acceptable and preferred over guesses.
- For debate category topics, populate debate_for and debate_against arrays with 3–4 items each.

Also return a short industry_summary (2–5 lines) naming the workspace's inferred industry and key subdomains. Example:
"Industry: Industrial Waste Management & Resource Recovery\\nSubdomains:\\n- Hazardous Waste\\n- Wastewater Treatment\\n- Metals Recovery"

Respond with a JSON object — no markdown fences, no explanation, just the JSON — with exactly this shape:
{
  "industry_summary": "string",
  "topics": [
    {
      "title": "string",
      "category": "foundational|advanced|emerging|debate|thinker",
      "importance_score": 0-100,
      "importance_level": "essential|important|specialized|emerging",
      "status": "core|trending|controversial|emerging",
      "summary": "2-3 sentence explanation of why this matters in the field",
      "frameworks": ["Framework Name"],
      "thinkers": [],
      "debates": ["A key open question"],
      "related_topics": ["Related Topic Name"],
      "recommended_reading": [],
      "content_angles": ["Angle 1 (5–10 words)", "Angle 2", "Angle 3"],
      "frequently_confused_with": [],
      "debate_for": [],
      "debate_against": [],
      "trend_connections": [],
      "related_signal_topics": []
    }
  ]
}`
}

export function buildUserMessage(ctx: WorkspaceContext): string {
  const lines: string[] = []
  if (ctx.brand_name) lines.push(`Brand: ${ctx.brand_name}`)
  if (ctx.services.length > 0) lines.push(`Services: ${ctx.services.join(', ')}`)
  if (ctx.content_topics.length > 0) lines.push(`Content topics: ${ctx.content_topics.join(', ')}`)
  if (ctx.recent_titles.length > 0) {
    lines.push(`Recent post titles (most recent first):`)
    ctx.recent_titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  }
  return lines.join('\n')
}

// ── Response parsing ───────────────────────────────────────────────────────

export function parseGenerationResponse(raw: string): { industry_summary: string; topics: KnowledgeTopic[] } | null {
  // Strip markdown fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  const jsonMatch = stripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.topics)) return null
  if (typeof obj.industry_summary !== 'string') return null

  const validTopics = (obj.topics as unknown[]).filter((t): t is KnowledgeTopic => {
    if (typeof t !== 'object' || t === null) return false
    const topic = t as Record<string, unknown>
    return (
      typeof topic.title === 'string' && topic.title.length > 0 &&
      typeof topic.category === 'string' &&
      typeof topic.summary === 'string' &&
      Array.isArray(topic.content_angles) && topic.content_angles.length > 0
    )
  })

  if (validTopics.length === 0) return null
  return { industry_summary: obj.industry_summary as string, topics: validTopics }
}

// ── Main generation function ───────────────────────────────────────────────

export async function generateKnowledgeTopics(ctx: WorkspaceContext): Promise<KnowledgeSignalsCache> {
  const hash = buildContextHash(ctx)

  const result = await callClaude({
    systemPrompt: buildSystemPrompt(),
    userMessage: buildUserMessage(ctx),
    maxTokens: 8000,
  })

  const parsed = parseGenerationResponse(result.content)
  if (!parsed) throw new Error('Failed to parse knowledge topics from Claude response')

  const topics = deduplicateTopics(
    parsed.topics.map(t => ({ ...t, id: slugify(t.title) }))
  )

  return {
    industry_summary: parsed.industry_summary,
    topics,
    generated_at: new Date().toISOString(),
    context_hash: hash,
  }
}
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npx vitest run tests/knowledge/generate.test.ts
```

Expected: All tests pass. If any fail, fix the implementation (not the tests) before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/knowledge/generate.ts
git commit -m "feat: knowledge signals generation library — hashing, cache check, prompt, parse, dedup"
```

---

## Task 4: Update the Route Handler

**Files:**
- Modify: `app/api/knowledge-signals/route.ts`

Replace the demo-data return with the full cache-check + generation flow. The route stays thin — all logic lives in `lib/knowledge/generate.ts`.

- [ ] **Step 1: Replace the route handler**

Replace the entire contents of `app/api/knowledge-signals/route.ts` with:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { DEMO_TOPICS } from '@/lib/knowledge/demo-data'
import {
  buildContextHash,
  isCacheFresh,
  hasEnoughContext,
  generateKnowledgeTopics,
  type KnowledgeSignalsCache,
  type WorkspaceContext,
} from '@/lib/knowledge/generate'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const [settingsResult, titlesResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workspace_feed_settings')
      .select('services, content_topics, brand_name, knowledge_signals_cache')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
    supabase
      .from('outputs')
      .select('title')
      .eq('workspace_id', session.workspaceId)
      .in('status', ['published', 'approved'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const ws = settingsResult.data as {
    services: string[]
    content_topics: string[]
    brand_name: string | null
    knowledge_signals_cache: KnowledgeSignalsCache | null
  } | null

  if (!ws) {
    return NextResponse.json({ topics: DEMO_TOPICS })
  }

  const ctx: WorkspaceContext = {
    brand_name: ws.brand_name ?? '',
    services: ws.services ?? [],
    content_topics: ws.content_topics ?? [],
    recent_titles: (titlesResult.data ?? [])
      .map((r: { title: string | null }) => r.title ?? '')
      .filter(Boolean),
  }

  if (!hasEnoughContext(ctx)) {
    return NextResponse.json({ topics: DEMO_TOPICS })
  }

  const currentHash = buildContextHash(ctx)

  if (ws.knowledge_signals_cache && isCacheFresh(ws.knowledge_signals_cache, currentHash)) {
    return NextResponse.json({ topics: ws.knowledge_signals_cache.topics })
  }

  try {
    const cache = await generateKnowledgeTopics(ctx)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('workspace_feed_settings')
      .update({
        knowledge_signals_cache: cache,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', session.workspaceId)

    return NextResponse.json({ topics: cache.topics })
  } catch (err) {
    console.error('[knowledge-signals] generation failed:', err)
    const fallback = ws.knowledge_signals_cache?.topics ?? DEMO_TOPICS
    return NextResponse.json({ topics: fallback })
  }
}
```

- [ ] **Step 2: Run full test suite to check nothing broke**

```bash
npx vitest run
```

Expected: All tests pass. (The route itself has no unit tests — it's tested manually in the next task.)

- [ ] **Step 3: Commit**

```bash
git add app/api/knowledge-signals/route.ts
git commit -m "feat: workspace-specific knowledge signals — cache-check + Claude generation"
```

---

## Task 5: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test a workspace with context**

1. Sign into a workspace that has `services` or `content_topics` set in its feed settings
2. Navigate to `/[workspaceSlug]/feed`
3. Click the **Knowledge** tab
4. **Expected:** Topics should reflect the workspace's actual industry — not the generic marketing topics from demo data
5. Reload the page and click Knowledge again — **Expected:** Same topics returned instantly (cache hit, no Claude call)

- [ ] **Step 3: Test the low-context fallback**

1. In Supabase dashboard, temporarily clear `services`, `content_topics`, and `knowledge_signals_cache` for a test workspace, and ensure it has fewer than 5 published outputs
2. Load the Knowledge tab
3. **Expected:** Demo topics appear (Positioning, Demand Generation, etc.)

- [ ] **Step 4: Test cache invalidation**

1. In Supabase dashboard, update `services` on a workspace that has a cached result
2. Reload the Knowledge tab
3. **Expected:** New topics generated that reflect the updated services (Claude is called, new cache written)

- [ ] **Step 5: Commit if any minor fixes were needed**

If no code changes were needed during smoke testing, skip this step. Otherwise:

```bash
git add -p
git commit -m "fix: knowledge signals smoke test corrections"
```
