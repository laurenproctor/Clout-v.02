# Fixes Applied

Updated: 2026-05-12

---

## Fix 1: Default slot assignment broken for new workspaces

**Bug:** New users visiting `/inbox` saw "No slot available" on every draft card.

**Root cause:** `buildWeeklyPlan()` in `lib/domain/weekly-plan.ts` had a null guard that prevented `assignNextSlot()` from being called when no `scheduling_preferences` row existed. But `assignNextSlot()` already has Mon/Wed/Fri 9am ET fallbacks built in — the guard was unnecessary and harmful.

```ts
// Before (broken)
const suggestedSlot = mappedPrefs ? assignNextSlot(mappedPrefs, taken) : null

// After (fixed)
const suggestedSlot = assignNextSlot(mappedPrefs, taken)
```

**Files changed:** `lib/domain/weekly-plan.ts`

**Confidence:** HIGH

---

## Fix 2: approved_by / approved_at not written on inbox approval

**Bug:** When approving from the inbox, `approved_by` and `approved_at` were not written to the outputs row (audit trail incomplete).

**Root cause:** `approveSelected()` domain function didn't accept or write a userId. The `/api/outputs/[id]/queue` route (the per-item queue endpoint) correctly set these fields, but the inbox bulk approval path (`/api/weekly-plan/approve-selected`) did not.

**Files changed:**
- `lib/domain/weekly-plan.ts` — added `approvedBy?: string` param to `approveSelected` and `approveWeek`, writes `approved_by` + `approved_at` to DB
- `app/api/weekly-plan/approve-selected/route.ts` — passes `session.userId`
- `app/api/weekly-plan/approve-week/route.ts` — passes `session.userId`

**Confidence:** HIGH

---

## Feature: WeeklyPlanWidget on dashboard

**What:** New `WeeklyPlanWidget` component added to the regular dashboard. Shows top 3 drafts from the weekly plan with suggested slot times and inline "→ Queue" buttons. Optimistic UI: card exits with fade+scale animation on approval. Links to full `/inbox` for bulk operations.

**Why:** Dashboard previously had no entry point to the approval loop. Users had to know to navigate to `/inbox` — there was no nudge.

**Files changed:**
- `components/dashboard/WeeklyPlanWidget.tsx` — new component
- `app/(dashboard)/dashboard/page.tsx` — imports and renders `WeeklyPlanWidget` above the Momentum/PublishingEngine widget grid

**Confidence:** HIGH

---

## Feature: Topic Mode (Release B)

**What:** Users can start a capture with a subject line. Clout searches for credible sources via Tavily, distils a research brief with Claude Haiku, then generates a voiced post with the selected lens via Sonnet. Sources are shown in an expandable chip. Step logging: `research_started`, `research_complete`, `generate_complete`.

**Files:**

- `supabase/migrations/20260425_topic_mode.sql` — DB migration (pre-existing)
- `types/domain.ts` — CaptureSource, ResearchSource, Capture (pre-existing)
- `lib/ai/research.ts` — searchTavily + summariseSources + researchTopic (pre-existing)
- `app/api/capture/[id]/research/route.ts` — research endpoint + step logging (fixed: removed as-any cast)
- `app/api/generate/route.ts` — research context injection + generate_complete log (pre-existing + logging added)
- `components/capture/topic-capture-flow.tsx` — full state machine UI (pre-existing)
- `components/capture/capture-composer.tsx` — Topic tab + wiring (pre-existing)
- `types/db.ts` — added 'topic' to enum, research columns to captures shape (fixed)
- `lib/domain/capture.ts` — removed as-any cast on source field (fixed)

**Confidence:** HIGH

---

## Feature: Angle Routing (Release C)

**What:** Voice and topic captures now extract 2–4 strategic content angles via Claude Haiku immediately after transcription (voice) or research (topic). If 2+ distinct angles are found, the flow shows an `AngleOptions` picker instead of jumping straight to a draft. The strongest angle is generated in the background while the user decides. Users can draft the best angle, draft any specific angle, draft all angles in parallel (capped at 4 with a shared `generation_group_id`), or skip angle selection. Studio variant rail groups siblings by `generation_group_id` when present so all angle variants appear together.

**Files changed:**

- `supabase/migrations/20260426_angle_routing.sql` — adds `extracted_angles` JSONB to captures; `angle_id` TEXT + `generation_group_id` UUID to generations; `generation_group_id` UUID to outputs; partial indexes on group columns
- `types/db.ts` — added `extracted_angles`, `angle_id`, `generation_group_id` columns to Row/Insert/Update types
- `types/domain.ts` — added `Angle` interface; `extractedAngles` to `Capture`; `angleId` + `generationGroupId` to `Generation`; `generationGroupId` to `Output`
- `lib/ai/generate.ts` — added `extractAngles()` using Haiku; validates shape, generates UUIDs for missing ids, slices to ≤4, returns `[]` on any error
- `app/api/capture/[id]/extract-angles/route.ts` — new POST route; auth + workspace ownership; runs `extractAngles()`; persists to `captures.extracted_angles`
- `app/api/generate/route.ts` — accepts `angle_id` + `generation_group_id`; injects angle context into user message; stores both on generation and output rows; stores `content.angle = angle.title` for VariantsRail labelling
- `lib/domain/output.ts` — maps `generationGroupId`; adds `listOutputsByGroupId()`
- `app/api/outputs/route.ts` — supports `?generation_group_id=` query param
- `components/capture/angle-options.tsx` — new AngleOptions picker component
- `components/capture/voice-capture-flow.tsx` — added `angles_ready` state, angle extraction after transcription, `handleDraftBest` / `handleDraftOne` / `handleDraftAll` / `handleSkipAngles` handlers
- `components/capture/topic-capture-flow.tsx` — same `angles_ready` state added after research step
- `app/(dashboard)/studio/[id]/page.tsx` — prefers `generation_group_id` for sibling variant fetch, falls back to `generation_id`

**Confidence:** HIGH
