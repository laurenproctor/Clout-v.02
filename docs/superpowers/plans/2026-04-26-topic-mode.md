# Topic Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and verify Topic Mode — the capture path that starts with a subject line and delivers a researched, voice-matched post draft.

**Architecture:** All five components are already implemented (migration, domain types, research lib, API routes, UI component). The only gap is a stale `types/db.ts` that is missing `'topic'` in the `capture_source` enum and `research_sources`/`research_summary` in the captures shape. Two `as any` casts work around this today but must be removed. After fixing the types, the task is end-to-end verification.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), Anthropic SDK (Claude Haiku for summarisation, Sonnet for generation), Tavily search API, TypeScript, Tailwind CSS.

---

## What is already built

Before starting, confirm these files exist and are complete:

| File | Status |
|------|--------|
| `supabase/migrations/20260425_topic_mode.sql` | ✅ adds `topic` to `capture_source` enum + research columns |
| `types/domain.ts` — `CaptureSource`, `ResearchSource`, `Capture` | ✅ all include topic/research fields |
| `lib/domain/capture.ts` — `toCapture()` | ✅ maps `research_sources` / `research_summary` |
| `lib/ai/research.ts` — `searchTavily`, `summariseSources`, `researchTopic` | ✅ complete |
| `app/api/capture/[id]/research/route.ts` | ✅ complete (uses `as any` workaround) |
| `app/api/generate/route.ts` lines 100-105 | ✅ prepends research context for topic captures |
| `components/capture/topic-capture-flow.tsx` | ✅ idle → researching → drafting → draft_ready → error |
| `components/shared/generating-as-bar.tsx` | ✅ shows profile name + lens picker |
| `components/capture/capture-composer.tsx` | ✅ Topic tab in mode bar, renders `<TopicCaptureFlow>` |

**The only work needed:** fix `types/db.ts`, remove `as any` casts, verify end-to-end.

---

## File Map

| File | Change |
|------|--------|
| `types/db.ts` | Add `\| "topic"` to `capture_source` enum (line 1308 + line 1477); add `research_sources`/`research_summary` to `captures` Row/Insert/Update |
| `app/api/capture/[id]/research/route.ts` | Remove `as any` cast on `supabase.from('captures')` |
| `lib/domain/capture.ts` | Remove `as any` cast on `source: input.source as any` |

---

## Task 1: Fix `types/db.ts` — add `topic` to enum

**Files:**
- Modify: `types/db.ts:1308`
- Modify: `types/db.ts:1477`

- [ ] **Step 1: Add `'topic'` to the `capture_source` string union (line 1308)**

Find:
```ts
      capture_source: "text" | "voice" | "structured" | "url"
```

Replace with:
```ts
      capture_source: "text" | "voice" | "structured" | "url" | "topic"
```

- [ ] **Step 2: Add `'topic'` to the enum array (line 1477)**

Find:
```ts
      capture_source: ["text", "voice", "structured", "url"],
```

Replace with:
```ts
      capture_source: ["text", "voice", "structured", "url", "topic"],
```

- [ ] **Step 3: Run typecheck — should still be 0 errors**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: no output (0 errors).

---

## Task 2: Add research columns to `types/db.ts` captures shape

**Files:**
- Modify: `types/db.ts` — captures `Row`, `Insert`, `Update` blocks

The captures `Row` block (around line 187) needs two new fields. The `Insert` and `Update` blocks need optional versions.

- [ ] **Step 1: Add fields to `captures.Row`**

In the `captures.Row` block, after `raw_content: string | null`, add:
```ts
          research_sources: Json | null
          research_summary: string | null
```

Full Row block becomes:
```ts
        Row: {
          audio_path: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_private: boolean
          notes: string | null
          raw_content: string | null
          research_sources: Json | null
          research_summary: string | null
          source: Database["public"]["Enums"]["capture_source"]
          source_url: string | null
          status: Database["public"]["Enums"]["capture_status"]
          structured_data: Json | null
          tags: string[]
          transcript: string | null
          updated_at: string
          workspace_id: string
        }
```

- [ ] **Step 2: Add optional fields to `captures.Insert`**

In the `captures.Insert` block, after `raw_content?: string | null`, add:
```ts
          research_sources?: Json | null
          research_summary?: string | null
```

- [ ] **Step 3: Add optional fields to `captures.Update`**

In the `captures.Update` block, after `raw_content?: string | null`, add:
```ts
          research_sources?: Json | null
          research_summary?: string | null
```

- [ ] **Step 4: Run typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: no output.

---

## Task 3: Remove `as any` casts

**Files:**
- Modify: `app/api/capture/[id]/research/route.ts:43`
- Modify: `lib/domain/capture.ts:37`

- [ ] **Step 1: Fix research route — remove `as any` on supabase client**

In `app/api/capture/[id]/research/route.ts`, replace:
```ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('captures') as any)
    .update({
      research_sources: sources.length > 0 ? sources : null,
      research_summary: summary || null,
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', captureId)
```

With:
```ts
  await supabase
    .from('captures')
    .update({
      research_sources: sources.length > 0 ? (sources as import('@/types/db').Json) : null,
      research_summary: summary || null,
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', captureId)
```

- [ ] **Step 2: Fix capture domain — remove `as any` on source field**

In `lib/domain/capture.ts`, in the `createCapture` function, replace:
```ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source: input.source as any,
```

With:
```ts
      source: input.source,
```

(Now valid because `capture_source` enum includes `'topic'`.)

- [ ] **Step 3: Run typecheck — confirm still 0 errors**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add types/db.ts app/api/capture/[id]/research/route.ts lib/domain/capture.ts
git commit -m "feat(topic-mode): update db types for topic source and research columns, remove as-any casts"
```

---

## Task 4: End-to-end verification

Run the dev server and manually verify all 9 spec items.

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npm run dev
```

Then open `http://localhost:3000/capture/new`.

- [ ] **Check 1: Topic tab visible in composer**

The mode bar should show: Write · Paste · Upload · Voice · **Topic**. Clicking Topic shows the `TopicCaptureFlow` idle state with "Start with a topic" headline, textarea, example chips, GeneratingAsBar attribution bar, and "Research & Draft →" CTA.

- [ ] **Check 2: Submit a topic**

Type: `Contrarian take on open-plan offices` → click "Research & Draft →" (or ⌘↵).

Expected: flow transitions to `researching` state.

- [ ] **Check 3: Progress states advance**

Verify these labels appear in sequence with animated transitions:
1. "Researching sources…"
2. "Finding key signals…"
3. "Shaping your perspective…"
4. "Writing draft…"

And source hostnames appear as small chips once Tavily returns results.

- [ ] **Check 4: Draft successfully returns**

Flow reaches `draft_ready`. Draft preview card appears with paragraph content. "Open in Studio →" and "↻ Try another topic" buttons are visible.

- [ ] **Check 5: Sources chip expands**

Click "Sources (N)" → list expands showing each source with title, hostname, and external link icon. Sources link to original URLs in new tab.

- [ ] **Check 6: Lens selection respected**

Return to idle (click "↻ Try another topic"). Change lens in GeneratingAsBar picker. Submit same topic. Open the generated output in Studio and verify the lens applied is reflected in content tone/structure.

- [ ] **Check 7: Profile attribution visible**

GeneratingAsBar in idle state shows the user's `display_name` in the Perspective chip and the selected lens name. In draft_ready, it shows "Written as [name] · [lens]" in read-only mode.

- [ ] **Check 8: Fallback works if research fails**

To simulate Tavily failure, temporarily set `TAVILY_API_KEY=invalid` in `.env.local` and restart dev server. Submit a topic. Expected: "Research unavailable right now. Drafting from your topic only." message appears during processing, and generation still completes from topic text alone.

Restore valid key after verifying.

- [ ] **Check 9: No regressions in existing modes**

Switch to Write, Paste, Voice, Upload modes. Confirm each renders correctly and submit a capture to verify the mode bar switching doesn't break existing flows.

---

## Task 5: Update reliability docs

**Files:**
- Modify: `docs/reliability-status.md`
- Modify: `docs/fixes-applied.md`

- [ ] **Step 1: Add Topic Mode to reliability-status.md**

Add this row to the table:

```
| Topic mode | GREEN | Full pipeline: Tavily search → Haiku summarise → Sonnet generate. Research failure gracefully degrades. |
```

- [ ] **Step 2: Add entry to fixes-applied.md**

```markdown
## Feature: Topic Mode (Release B)

**What:** Users can start a capture with a subject line. Clout searches for credible sources via Tavily, distils a research brief with Claude Haiku, then generates a voiced post with the selected lens via Sonnet. Sources are shown in an expandable chip.

**Files:**
- `supabase/migrations/20260425_topic_mode.sql` — DB migration (pre-existing)
- `types/domain.ts` — CaptureSource, ResearchSource, Capture (pre-existing)
- `lib/ai/research.ts` — searchTavily + summariseSources + researchTopic (pre-existing)
- `app/api/capture/[id]/research/route.ts` — research endpoint (pre-existing)
- `app/api/generate/route.ts` — research context injection (pre-existing)
- `components/capture/topic-capture-flow.tsx` — full state machine UI (pre-existing)
- `components/capture/capture-composer.tsx` — Topic tab + wiring (pre-existing)
- `types/db.ts` — added 'topic' to enum, research columns to captures shape (fixed)

**Confidence:** HIGH
```

- [ ] **Step 3: Commit docs**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add docs/reliability-status.md docs/fixes-applied.md
git commit -m "docs: mark topic mode GREEN in reliability status"
```

---

## Spec Coverage Checklist

| Spec requirement | Task | Status |
|-----------------|------|--------|
| New Topic Mode in composer | Pre-built (verified Task 4 Check 1) | ✅ |
| Topic → Research → Draft pipeline | Pre-built (verified Task 4 Check 4) | ✅ |
| Sources trust layer | Pre-built (verified Task 4 Check 5) | ✅ |
| Micro-progress states | Pre-built (verified Task 4 Check 3) | ✅ |
| Draft-ready UX consistent with other modes | Pre-built (verified Task 4 Check 4) | ✅ |
| Migration: `capture_source += 'topic'` | Pre-built in 20260425_topic_mode.sql | ✅ |
| Migration: research_sources + research_summary | Pre-built in 20260425_topic_mode.sql | ✅ |
| CaptureSource includes 'topic' | Pre-built in types/domain.ts | ✅ |
| ResearchSource interface | Pre-built in types/domain.ts | ✅ |
| Capture includes researchSources / researchSummary | Pre-built in types/domain.ts | ✅ |
| DB types match (no as-any casts) | **Task 1-3** | 🔧 fix needed |
| Attribution bar: profile name + lens | Pre-built via GeneratingAsBar | ✅ |
| Graceful fallback if research fails | Pre-built in research route | ✅ |
| Bottom Generate CTA hidden for Topic mode | Pre-built in capture-composer | ✅ |
| `⌘↵` keyboard shortcut | Pre-built in topic-capture-flow | ✅ |
| No regression to existing modes | Verified Task 4 Check 9 | ✅ |
