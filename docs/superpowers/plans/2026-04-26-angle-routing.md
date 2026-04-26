# Angle Routing (Release C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn one voice memo or topic input into 2–4 strategically distinct post angles, draft the strongest automatically, and let users explore alternatives in Studio via a sibling variants rail.

**Architecture:** Angle extraction is a new Haiku-powered step that runs after transcription (voice) or research (topic). If 2+ strong angles surface, the UI enters `angles_ready` state, immediately starts generating the best angle in the background, and offers an optional "Draft All" path. All generations sharing one origin get a `generation_group_id` UUID so Studio can group sibling variants. If extraction fails or finds ≤1 angle, the flow continues silently as before.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), Anthropic SDK (Claude Haiku for extraction, Sonnet for generation), TypeScript, Tailwind CSS.

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/20260426_angle_routing.sql` | New — adds `extracted_angles` to captures, `angle_id`+`generation_group_id` to generations and outputs |
| `types/domain.ts` | Add `Angle` interface; extend `Capture`, `Generation`, `Output` |
| `types/db.ts` | Extend captures, generations, outputs Row/Insert/Update shapes |
| `lib/ai/generate.ts` | Add `extractAngles()` |
| `lib/domain/capture.ts` | Map `extracted_angles` in `toCapture()` |
| `app/api/capture/[id]/extract-angles/route.ts` | New POST route |
| `app/api/generate/route.ts` | Accept `angle_id` + `generation_group_id`; prepend angle context; persist fields |
| `lib/domain/output.ts` | Map `generation_group_id` in `toOutput()`; add `listOutputsByGroupId()` |
| `app/api/outputs/route.ts` | Support `?generation_group_id=` query param |
| `components/capture/angle-options.tsx` | New component — card list + Draft Best / Draft All / Skip |
| `components/capture/voice-capture-flow.tsx` | Add `angles_ready` state; call extract-angles; background-gen strongest |
| `components/capture/topic-capture-flow.tsx` | Same angle injection after research |
| `app/(dashboard)/studio/[id]/page.tsx` | Group siblings by `generation_group_id` when present |

---

## Task 1: DB migration

**Files:**
- Create: `supabase/migrations/20260426_angle_routing.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260426_angle_routing.sql

-- 1. Captures: store extracted angles
ALTER TABLE captures
  ADD COLUMN IF NOT EXISTS extracted_angles JSONB;

-- 2. Generations: track which angle was used + group
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS angle_id    TEXT,
  ADD COLUMN IF NOT EXISTS generation_group_id UUID;

CREATE INDEX IF NOT EXISTS generations_group_idx
  ON generations(generation_group_id)
  WHERE generation_group_id IS NOT NULL;

-- 3. Outputs: denormalised copy for fast variant lookup
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS generation_group_id UUID;

CREATE INDEX IF NOT EXISTS outputs_group_idx
  ON outputs(generation_group_id)
  WHERE generation_group_id IS NOT NULL;
```

- [ ] **Step 2: Apply migration**

Apply via Supabase dashboard SQL editor or:
```bash
npx supabase db push
```

If you cannot run `db push` locally, paste the SQL into the Supabase dashboard SQL editor and execute it. Confirm the columns exist before proceeding.

- [ ] **Step 3: Typecheck (confirm no regressions yet)**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors (types/db.ts not yet updated — that's Task 2 & 3).

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add supabase/migrations/20260426_angle_routing.sql
git commit -m "feat(angle-routing): DB migration — extracted_angles, angle_id, generation_group_id"
```

---

## Task 2: Update `types/domain.ts`

**Files:**
- Modify: `types/domain.ts`

- [ ] **Step 1: Add `Angle` interface after `ResearchSource`**

Find:
```ts
export type CaptureStatus = 'pending' | 'processing' | 'ready' | 'failed'
```

Replace with:
```ts
export interface Angle {
  id: string
  title: string
  summary: string
  rationale: string
  recommendedLensId?: string | null
}

export type CaptureStatus = 'pending' | 'processing' | 'ready' | 'failed'
```

- [ ] **Step 2: Add `extractedAngles` to `Capture`**

Find (in the `Capture` interface):
```ts
  researchSources: ResearchSource[] | null
  researchSummary: string | null
  createdAt: string
```

Replace with:
```ts
  researchSources: ResearchSource[] | null
  researchSummary: string | null
  extractedAngles: Angle[] | null
  createdAt: string
```

- [ ] **Step 3: Add `angleId` and `generationGroupId` to `Generation`**

Find (in the `Generation` interface):
```ts
  durationMs: number | null
  tokenCount: number | null
  createdAt: string
  completedAt: string | null
```

Replace with:
```ts
  durationMs: number | null
  tokenCount: number | null
  angleId: string | null
  generationGroupId: string | null
  createdAt: string
  completedAt: string | null
```

- [ ] **Step 4: Add `generationGroupId` to `Output`**

Find (in the `Output` interface):
```ts
  approvedForWeek:      boolean
  weekBucket:           string | null
  performanceSnapshot:  Record<string, unknown> | null
  createdAt: string
```

Replace with:
```ts
  generationGroupId:    string | null
  approvedForWeek:      boolean
  weekBucket:           string | null
  performanceSnapshot:  Record<string, unknown> | null
  createdAt: string
```

- [ ] **Step 5: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: errors only about missing properties on DB types (types/db.ts not updated yet). No errors in domain/ or components/.

- [ ] **Step 6: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add types/domain.ts
git commit -m "feat(angle-routing): add Angle type, extend Capture/Generation/Output domain types"
```

---

## Task 3: Update `types/db.ts`

**Files:**
- Modify: `types/db.ts`

The goal is to add the new DB columns to the Supabase-generated type shapes so TypeScript is satisfied.

- [ ] **Step 1: Add `extracted_angles` to captures Row**

Find (in `captures.Row`):
```ts
          research_sources: Json | null
          research_summary: string | null
          source: Database["public"]["Enums"]["capture_source"]
```

Replace with:
```ts
          extracted_angles: Json | null
          research_sources: Json | null
          research_summary: string | null
          source: Database["public"]["Enums"]["capture_source"]
```

- [ ] **Step 2: Add `extracted_angles` to captures Insert and Update**

Find (in `captures.Insert`):
```ts
          research_sources?: Json | null
          research_summary?: string | null
          source: Database["public"]["Enums"]["capture_source"]
```

Replace with:
```ts
          extracted_angles?: Json | null
          research_sources?: Json | null
          research_summary?: string | null
          source: Database["public"]["Enums"]["capture_source"]
```

Find (in `captures.Update`):
```ts
          research_sources?: Json | null
          research_summary?: string | null
          source?: Database["public"]["Enums"]["capture_source"]
```

Replace with:
```ts
          extracted_angles?: Json | null
          research_sources?: Json | null
          research_summary?: string | null
          source?: Database["public"]["Enums"]["capture_source"]
```

- [ ] **Step 3: Add `angle_id` and `generation_group_id` to generations Row/Insert/Update**

Find (in `generations.Row`):
```ts
          duration_ms: number | null
          error_message: string | null
          id: string
```

Replace with:
```ts
          angle_id: string | null
          duration_ms: number | null
          error_message: string | null
          generation_group_id: string | null
          id: string
```

Find (in `generations.Insert`):
```ts
          duration_ms?: number | null
          error_message?: string | null
          id?: string
```

Replace with:
```ts
          angle_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          generation_group_id?: string | null
          id?: string
```

Find (in `generations.Update`):
```ts
          duration_ms?: number | null
          error_message?: string | null
          id?: string
```

Replace with:
```ts
          angle_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          generation_group_id?: string | null
          id?: string
```

- [ ] **Step 4: Add `generation_group_id` to outputs Row/Insert/Update**

Find (in `outputs.Row`) the block of fields including `generation_id`:
```ts
          generation_id: string
          id: string
          is_private: boolean | null
```

Replace with:
```ts
          generation_group_id: string | null
          generation_id: string
          id: string
          is_private: boolean | null
```

Find (in `outputs.Insert`):
```ts
          generation_id: string
          id?: string
          is_private?: boolean | null
```

Replace with:
```ts
          generation_group_id?: string | null
          generation_id: string
          id?: string
          is_private?: boolean | null
```

Find (in `outputs.Update`):
```ts
          generation_id?: string
          id?: string
          is_private?: boolean | null
```

Replace with:
```ts
          generation_group_id?: string | null
          generation_id?: string
          id?: string
          is_private?: boolean | null
```

- [ ] **Step 5: Typecheck — expect 0 errors**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add types/db.ts
git commit -m "feat(angle-routing): update types/db.ts for extracted_angles, angle_id, generation_group_id"
```

---

## Task 4: Add `extractAngles()` to `lib/ai/generate.ts`

**Files:**
- Modify: `lib/ai/generate.ts`

- [ ] **Step 1: Add the import at the top (already has Anthropic import — no change needed)**

- [ ] **Step 2: Add `extractAngles()` function at the end of the file**

Append to `lib/ai/generate.ts`:

```ts
export async function extractAngles(content: string): Promise<import('@/types/domain').Angle[]> {
  const systemPrompt = `You are an editorial strategist. Given a piece of content, identify 2 to 4 DISTINCT high-potential angles for a LinkedIn post.

Rules:
- Angles must be materially different in framing, not just different words for the same idea.
  BAD: "AI in hiring", "Hiring with AI", "AI hiring trends"
  GOOD: "Most hiring teams use AI backwards", "Why speed-hiring kills culture", "Recruiters will become operators"
- If the content only supports one strong angle, return an empty array.
- Each angle gets a short title (max 6 words), one-sentence summary, and one-sentence rationale for why it works.
- Return ONLY a valid JSON array. No markdown, no explanation.

Output format:
[
  {
    "id": "<uuid>",
    "title": "<max 6 words>",
    "summary": "<one sentence>",
    "rationale": "<one sentence why this angle works>",
    "recommendedLensId": null
  }
]`

  const userMessage = content.slice(0, 4000) // cap to avoid token overflow

  try {
    const result = await callClaude({
      systemPrompt,
      userMessage,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 600,
    })

    const jsonMatch = result.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    // Validate shape and generate IDs if missing
    const angles: import('@/types/domain').Angle[] = parsed
      .filter((a: unknown): a is Record<string, unknown> =>
        typeof a === 'object' && a !== null &&
        typeof (a as Record<string, unknown>).title === 'string' &&
        typeof (a as Record<string, unknown>).summary === 'string' &&
        typeof (a as Record<string, unknown>).rationale === 'string'
      )
      .slice(0, 4)
      .map((a: Record<string, unknown>) => ({
        id: (typeof a.id === 'string' && a.id) ? a.id : crypto.randomUUID(),
        title: a.title as string,
        summary: a.summary as string,
        rationale: a.rationale as string,
        recommendedLensId: null,
      }))

    // Only return if genuinely multiple distinct angles
    return angles.length >= 2 ? angles : []
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add lib/ai/generate.ts
git commit -m "feat(angle-routing): add extractAngles() to lib/ai/generate.ts"
```

---

## Task 5: Update `lib/domain/capture.ts` and create extract-angles route

**Files:**
- Modify: `lib/domain/capture.ts`
- Create: `app/api/capture/[id]/extract-angles/route.ts`

- [ ] **Step 1: Update `toCapture()` to map `extracted_angles`**

Find (in `lib/domain/capture.ts`, in `toCapture()`):
```ts
    researchSources: (row.research_sources as ResearchSource[] | null) ?? null,
    researchSummary: (row.research_summary as string | null) ?? null,
    createdAt: row.created_at as string,
```

Replace with:
```ts
    researchSources: (row.research_sources as ResearchSource[] | null) ?? null,
    researchSummary: (row.research_summary as string | null) ?? null,
    extractedAngles: (row.extracted_angles as import('@/types/domain').Angle[] | null) ?? null,
    createdAt: row.created_at as string,
```

- [ ] **Step 2: Create the extract-angles route**

```ts
// app/api/capture/[id]/extract-angles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCapture } from '@/lib/domain/capture'
import { extractAngles } from '@/lib/ai/generate'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: captureId } = await params

  const captureResult = await getCapture(captureId)
  if (!captureResult.ok) return NextResponse.json({ error: 'Capture not found' }, { status: 404 })

  const capture = captureResult.data
  if (capture.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const content = capture.transcript ?? capture.rawContent ?? ''
  if (!content.trim()) {
    return NextResponse.json({ angles: [] })
  }

  console.log('[angle] extract_started', { capture_id: captureId })

  const angles = await extractAngles(content)

  console.log('[angle] extract_complete', { capture_id: captureId, count: angles.length })

  if (angles.length > 0) {
    const supabase = await createClient()
    await supabase
      .from('captures')
      .update({ extracted_angles: angles as unknown as Json })
      .eq('id', captureId)
  }

  return NextResponse.json({ angles })
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add lib/domain/capture.ts "app/api/capture/[id]/extract-angles/route.ts"
git commit -m "feat(angle-routing): add extract-angles API route and map extractedAngles in domain"
```

---

## Task 6: Update `app/api/generate/route.ts`

**Files:**
- Modify: `app/api/generate/route.ts`

Accept `angle_id` and `generation_group_id` from the request body, prepend angle context to the generation prompt when present, and persist both fields on the generation and output records.

- [ ] **Step 1: Extract new fields from request body**

Find:
```ts
  const body = await req.json()
  const { capture_id, lens_id } = body
  const channelId = body.channel_id ?? null
```

Replace with:
```ts
  const body = await req.json()
  const { capture_id, lens_id } = body
  const channelId = body.channel_id ?? null
  const angleId: string | null = body.angle_id ?? null
  const generationGroupId: string | null = body.generation_group_id ?? null
```

- [ ] **Step 2: Inject angle context into the user message**

Find:
```ts
  // For topic captures, prepend research brief when available
  if (capture.source === 'topic' && capture.researchSummary) {
    userMessage = `## Research context\n${capture.researchSummary}\n\n## Topic instruction\n${userMessage}`
  }
```

Replace with:
```ts
  // For topic captures, prepend research brief when available
  if (capture.source === 'topic' && capture.researchSummary) {
    userMessage = `## Research context\n${capture.researchSummary}\n\n## Topic instruction\n${userMessage}`
  }

  // When angle routing: prepend the specific angle to develop
  if (angleId && capture.extractedAngles) {
    const angle = capture.extractedAngles.find(a => a.id === angleId)
    if (angle) {
      userMessage = `## Angle to develop\nTitle: ${angle.title}\nSummary: ${angle.summary}\n\n## Source content\n${userMessage}`
    }
  }
```

- [ ] **Step 3: Persist `angle_id` and `generation_group_id` on the generation record**

Find:
```ts
  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      workspace_id: session.workspaceId,
      capture_id: capture.id,
      lens_id: resolvedLensId,
      profile_id: profile?.id ?? session.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: systemPrompt,
    })
```

Replace with:
```ts
  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      workspace_id: session.workspaceId,
      capture_id: capture.id,
      lens_id: resolvedLensId,
      profile_id: profile?.id ?? session.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: systemPrompt,
      ...(angleId && { angle_id: angleId }),
      ...(generationGroupId && { generation_group_id: generationGroupId }),
    })
```

- [ ] **Step 4: Store angle title in output content + persist generation_group_id on output**

Find:
```ts
  const { data: output, error: outputError } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      generation_id: generation.id,
      status: 'draft',
      title: typeof content.hook === 'string' ? content.hook.slice(0, 120) : null,
      content: content as import('@/types/db').Json,
    })
```

Replace with:
```ts
  // If this was angle-routed, store the angle title in content for VariantsRail labelling
  if (angleId && capture.extractedAngles) {
    const angle = capture.extractedAngles.find(a => a.id === angleId)
    if (angle) content.angle = angle.title
  }

  const { data: output, error: outputError } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      generation_id: generation.id,
      status: 'draft',
      title: typeof content.hook === 'string' ? content.hook.slice(0, 120) : null,
      content: content as import('@/types/db').Json,
      ...(generationGroupId && { generation_group_id: generationGroupId }),
    })
```

- [ ] **Step 5: Return `generation_group_id` in the response**

Find:
```ts
  return NextResponse.json(
    {
      output_id: output.id,
      generation_id: generation.id,
      content: output.content,
      raw_content: rawContent,
    },
    { status: 201 }
  )
```

Replace with:
```ts
  return NextResponse.json(
    {
      output_id: output.id,
      generation_id: generation.id,
      generation_group_id: generationGroupId,
      content: output.content,
      raw_content: rawContent,
    },
    { status: 201 }
  )
```

- [ ] **Step 6: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add app/api/generate/route.ts
git commit -m "feat(angle-routing): generate route accepts angle_id + generation_group_id, stores on generation+output"
```

---

## Task 7: Update output domain + API to support `generation_group_id` query

**Files:**
- Modify: `lib/domain/output.ts`
- Modify: `app/api/outputs/route.ts`

- [ ] **Step 1: Map `generation_group_id` in `toOutput()`**

Find (in `lib/domain/output.ts`, in `toOutput()`):
```ts
    approvedForWeek:     (row.approved_for_week as boolean) ?? false,
    weekBucket:          (row.week_bucket as string | null) ?? null,
```

Replace with:
```ts
    generationGroupId:   (row.generation_group_id as string | null) ?? null,
    approvedForWeek:     (row.approved_for_week as boolean) ?? false,
    weekBucket:          (row.week_bucket as string | null) ?? null,
```

- [ ] **Step 2: Add `listOutputsByGroupId()` to `lib/domain/output.ts`**

After the `listOutputsByGenerationId` function, add:

```ts
export async function listOutputsByGroupId(params: {
  generationGroupId: string
  workspaceId: string
}): Promise<DomainResult<Output[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, generation_group_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, published_at, scheduled_at, last_publish_error, approved_for_week, week_bucket, performance_snapshot, created_at, updated_at, channels(platform, label)')
    .eq('generation_group_id', params.generationGroupId)
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(6)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toOutput) }
}
```

- [ ] **Step 3: Update `app/api/outputs/route.ts` to support `generation_group_id`**

Find:
```ts
import { listOutputs, listOutputsByGenerationId } from '@/lib/domain/output'
```

Replace with:
```ts
import { listOutputs, listOutputsByGenerationId, listOutputsByGroupId } from '@/lib/domain/output'
```

Find:
```ts
  const generationId = searchParams.get('generation_id')

  if (generationId) {
    const result = await listOutputsByGenerationId({
      generationId,
      workspaceId: session.workspaceId,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json(result.data)
  }
```

Replace with:
```ts
  const generationId = searchParams.get('generation_id')
  const generationGroupId = searchParams.get('generation_group_id')

  if (generationGroupId) {
    const result = await listOutputsByGroupId({
      generationGroupId,
      workspaceId: session.workspaceId,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json(result.data)
  }

  if (generationId) {
    const result = await listOutputsByGenerationId({
      generationId,
      workspaceId: session.workspaceId,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json(result.data)
  }
```

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add lib/domain/output.ts app/api/outputs/route.ts
git commit -m "feat(angle-routing): add listOutputsByGroupId, outputs route supports generation_group_id param"
```

---

## Task 8: Build `AngleOptions` component

**Files:**
- Create: `components/capture/angle-options.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/capture/angle-options.tsx
'use client'

import { cn } from '@/lib/utils'
import type { Angle } from '@/types/domain'

interface AngleOptionsProps {
  angles: Angle[]
  bestAngleGenerating: boolean   // background gen for best angle is in-flight
  draftAllGenerating: boolean
  onDraftBest: () => void        // use the already-running background generation
  onDraftOne: (angle: Angle) => void  // draft a specific angle on-demand
  onDraftAll: () => void         // draft all in parallel
  onSkip: () => void             // proceed with existing draft
}

export function AngleOptions({
  angles,
  bestAngleGenerating,
  draftAllGenerating,
  onDraftBest,
  onDraftOne,
  onDraftAll,
  onSkip,
}: AngleOptionsProps) {
  const best = angles[0]

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-zinc-900">
            {angles.length} angles found
          </p>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            {bestAngleGenerating
              ? 'Drafting the strongest now…'
              : 'Strongest angle drafted.'}
          </p>
        </div>
      </div>

      {/* Angle cards */}
      <div className="flex flex-col gap-3">
        {angles.map((angle, i) => (
          <div
            key={angle.id}
            className={cn(
              'rounded-xl border p-4 flex flex-col gap-2 transition-colors',
              i === 0 ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-200 bg-white'
            )}
          >
            {i === 0 && (
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Strongest
              </span>
            )}
            <p className="text-[14px] font-semibold text-zinc-900 leading-snug">
              {angle.title}
            </p>
            <p className="text-[13px] text-zinc-600 leading-relaxed">
              {angle.summary}
            </p>
            <p className="text-[12px] text-zinc-400 italic leading-relaxed">
              Why this works: {angle.rationale}
            </p>
            <div className="flex gap-2 mt-1">
              {i === 0 ? (
                <button
                  type="button"
                  onClick={onDraftBest}
                  disabled={bestAngleGenerating}
                  className={cn(
                    'rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors',
                    bestAngleGenerating
                      ? 'bg-zinc-200 text-zinc-400 cursor-wait'
                      : 'bg-zinc-900 text-white hover:bg-zinc-700'
                  )}
                >
                  {bestAngleGenerating ? 'Drafting…' : 'Draft Best Angle →'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDraftOne(angle)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
                >
                  Draft This →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary actions */}
      <div className="flex items-center gap-4 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onDraftAll}
          disabled={draftAllGenerating}
          className={cn(
            'text-[13px] font-medium transition-colors',
            draftAllGenerating
              ? 'text-zinc-400 cursor-wait'
              : 'text-zinc-600 hover:text-zinc-900'
          )}
        >
          {draftAllGenerating ? 'Drafting all…' : `Draft All ${angles.length} →`}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Skip, use current draft
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add components/capture/angle-options.tsx
git commit -m "feat(angle-routing): add AngleOptions component"
```

---

## Task 9: Update `voice-capture-flow.tsx`

**Files:**
- Modify: `components/capture/voice-capture-flow.tsx`

The voice flow currently goes: `idle → recording → processing → draft_ready`. After transcription succeeds we insert an `angles_ready` state if 2+ angles are found. The best angle starts generating in the background immediately.

- [ ] **Step 1: Add `angles_ready` to FlowState and new state variables**

Find:
```ts
type FlowState = 'idle' | 'recording' | 'processing' | 'draft_ready' | 'error'
```

Replace with:
```ts
type FlowState = 'idle' | 'recording' | 'processing' | 'angles_ready' | 'draft_ready' | 'error'
```

- [ ] **Step 2: Add angle state variables (after existing useState declarations)**

Find:
```ts
  const [showCollapsible, setShowCollapsible] = useState(false)
```

Replace with:
```ts
  const [showCollapsible, setShowCollapsible] = useState(false)
  const [angles, setAngles] = useState<import('@/types/domain').Angle[]>([])
  const [bestAngleGenerating, setBestAngleGenerating] = useState(false)
  const [draftAllGenerating, setDraftAllGenerating] = useState(false)
  const bestOutputIdRef = useRef<string | null>(null)
```

- [ ] **Step 3: Replace the generate call inside `handleUploadAndProcess` with angle-aware pipeline**

Find (the Generate section inside `handleUploadAndProcess`):
```ts
      // Generate
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: capture.id, lens_id: selectedLensId }),
      })
      if (!gRes.ok) throw new Error('Generation failed')
      const gen = await gRes.json()
      setOutputId(gen.output_id ?? null)

      const body =
        (gen.content as Record<string, unknown> | null)?.body as string | undefined ??
        gen.raw_content ??
        ''
      const lines = body.split('\n\n').filter(Boolean)
      setDraftLines(lines.length > 0 ? lines : body ? [body] : ['Draft ready — open in Studio to view.'])
      setFlowState('draft_ready')
```

Replace with:
```ts
      // Extract angles (non-blocking — fallback to direct generate on failure)
      let extractedAngles: import('@/types/domain').Angle[] = []
      try {
        const aRes = await fetch(`/api/capture/${capture.id}/extract-angles`, { method: 'POST' })
        if (aRes.ok) {
          const aData = await aRes.json()
          extractedAngles = aData.angles ?? []
        }
      } catch {
        // extraction failed — proceed without angles
      }

      if (extractedAngles.length >= 2) {
        setAngles(extractedAngles)
        setFlowState('angles_ready')
        // Start background generation for best angle immediately
        const groupId = crypto.randomUUID()
        setBestAngleGenerating(true)
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_id: capture.id,
            lens_id: selectedLensId,
            angle_id: extractedAngles[0].id,
            generation_group_id: groupId,
          }),
        })
          .then(r => r.ok ? r.json() : Promise.reject(r.status))
          .then(gen => { bestOutputIdRef.current = gen.output_id ?? null })
          .catch(() => { bestOutputIdRef.current = null })
          .finally(() => setBestAngleGenerating(false))
        return
      }

      // No strong angles — generate directly
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: capture.id, lens_id: selectedLensId }),
      })
      if (!gRes.ok) throw new Error('Generation failed')
      const gen = await gRes.json()
      setOutputId(gen.output_id ?? null)

      const body =
        (gen.content as Record<string, unknown> | null)?.body as string | undefined ??
        gen.raw_content ??
        ''
      const lines = body.split('\n\n').filter(Boolean)
      setDraftLines(lines.length > 0 ? lines : body ? [body] : ['Draft ready — open in Studio to view.'])
      setFlowState('draft_ready')
```

- [ ] **Step 4: Add handler functions for angle actions**

Find (just before the `return (` of the component):
```ts
  function handleUseDraft() {
    if (outputId) onComplete(outputId)
  }
```

Add after that function and before `function handleRetry`:

```ts
  async function handleDraftBest() {
    if (bestOutputIdRef.current) {
      onComplete(bestOutputIdRef.current)
      return
    }
    // Still generating — wait by polling
    const maxWait = 30000
    const start = Date.now()
    while (Date.now() - start < maxWait) {
      if (bestOutputIdRef.current) { onComplete(bestOutputIdRef.current); return }
      await new Promise(r => setTimeout(r, 400))
    }
    setErrorMsg('Draft timed out. Please try again.')
    setFlowState('error')
  }

  async function handleDraftOne(angle: import('@/types/domain').Angle) {
    const captId = captureId
    if (!captId) return
    const groupId = crypto.randomUUID()
    try {
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capture_id: captId,
          lens_id: selectedLensId,
          angle_id: angle.id,
          generation_group_id: groupId,
        }),
      })
      if (!gRes.ok) throw new Error('Generation failed')
      const gen = await gRes.json()
      if (gen.output_id) onComplete(gen.output_id)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed')
      setFlowState('error')
    }
  }

  async function handleDraftAll() {
    const captId = captureId
    if (!captId || angles.length < 2) return
    setDraftAllGenerating(true)
    const groupId = crypto.randomUUID()
    const cap = Math.min(angles.length, 4)
    const results = await Promise.allSettled(
      angles.slice(0, cap).map(angle =>
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_id: captId,
            lens_id: selectedLensId,
            angle_id: angle.id,
            generation_group_id: groupId,
          }),
        }).then(r => r.ok ? r.json() : Promise.reject(r.status))
      )
    )
    const first = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ output_id: string }> | undefined
    setDraftAllGenerating(false)
    if (first?.value?.output_id) onComplete(first.value.output_id)
  }

  function handleSkipAngles() {
    // Use best angle output if ready, otherwise navigate to capture detail
    if (bestOutputIdRef.current) {
      onComplete(bestOutputIdRef.current)
    } else {
      setFlowState('draft_ready')
    }
  }
```

- [ ] **Step 5: Add the `angles_ready` render block**

Find (in the JSX, just before `{/* ── DRAFT READY ── */}`):
```ts
      {/* ── DRAFT READY ── */}
```

Insert before it:
```tsx
      {/* ── ANGLES READY ── */}
      {flowState === 'angles_ready' && (
        <div className="px-6 py-4">
          <AngleOptions
            angles={angles}
            bestAngleGenerating={bestAngleGenerating}
            draftAllGenerating={draftAllGenerating}
            onDraftBest={handleDraftBest}
            onDraftOne={handleDraftOne}
            onDraftAll={handleDraftAll}
            onSkip={handleSkipAngles}
          />
        </div>
      )}
```

- [ ] **Step 6: Add import for AngleOptions**

At the top of the file, after existing imports:
```ts
import { AngleOptions } from '@/components/capture/angle-options'
```

- [ ] **Step 7: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add components/capture/voice-capture-flow.tsx
git commit -m "feat(angle-routing): add angles_ready state to voice-capture-flow with background generation"
```

---

## Task 10: Update `topic-capture-flow.tsx`

**Files:**
- Modify: `components/capture/topic-capture-flow.tsx`

Same pattern as voice: after research, extract angles, branch if 2+.

- [ ] **Step 1: Add `angles_ready` to FlowState**

Find:
```ts
type FlowState = 'idle' | 'researching' | 'drafting' | 'draft_ready' | 'error'
```

Replace with:
```ts
type FlowState = 'idle' | 'researching' | 'drafting' | 'angles_ready' | 'draft_ready' | 'error'
```

- [ ] **Step 2: Add angle state variables**

Find:
```ts
  const [outputId, setOutputId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
```

Replace with:
```ts
  const [outputId, setOutputId] = useState<string | null>(null)
  const [captureId, setCaptureId] = useState<string | null>(null)
  const [angles, setAngles] = useState<import('@/types/domain').Angle[]>([])
  const [bestAngleGenerating, setBestAngleGenerating] = useState(false)
  const [draftAllGenerating, setDraftAllGenerating] = useState(false)
  const bestOutputIdRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
```

Note: the topic flow already stores captureId locally via `const captureId: string = capture.id` inside `handleSubmit`. We need it in component scope for angle handlers. If a `captureId` state already exists in the file, skip adding the duplicate.

- [ ] **Step 3: Store captureId in state and add angle extraction after research**

Find inside `handleSubmit` (after the research section, before "Step 3: Shape perspective"):
```ts
      const captureId: string = capture.id

      // Step 2: Research
      advanceMicrostate(1)
      const researchRes = await fetch(`/api/capture/${captureId}/research`, {
```

Replace with:
```ts
      setCaptureId(capture.id)
      const captureId: string = capture.id

      // Step 2: Research
      advanceMicrostate(1)
      const researchRes = await fetch(`/api/capture/${captureId}/research`, {
```

Then find (after the research block, before "Step 3: Shape perspective"):
```ts
      // Step 3: Shape perspective
      advanceMicrostate(2)
      setFlowState('drafting')

      // Step 4: Generate
      advanceMicrostate(3)
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: captureId, lens_id: selectedLensId }),
      })
      if (!genRes.ok) throw new Error('Generation failed')
      const genData = await genRes.json()

      const body =
        typeof genData.raw_content === 'string'
          ? genData.raw_content
          : (genData.content as Record<string, unknown>)?.body as string ?? ''

      setDraftLines(body.split('\n\n').filter(Boolean))
      setOutputId(genData.output_id)
      setProgress(100)
      setFlowState('draft_ready')
```

Replace with:
```ts
      // Step 3: Extract angles (non-blocking fallback)
      advanceMicrostate(2)
      let extractedAngles: import('@/types/domain').Angle[] = []
      try {
        const aRes = await fetch(`/api/capture/${captureId}/extract-angles`, { method: 'POST' })
        if (aRes.ok) {
          const aData = await aRes.json()
          extractedAngles = aData.angles ?? []
        }
      } catch {
        // extraction failed — proceed without angles
      }

      if (extractedAngles.length >= 2) {
        setAngles(extractedAngles)
        setFlowState('angles_ready')
        // Start background generation for best angle immediately
        const groupId = crypto.randomUUID()
        setBestAngleGenerating(true)
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_id: captureId,
            lens_id: selectedLensId,
            angle_id: extractedAngles[0].id,
            generation_group_id: groupId,
          }),
        })
          .then(r => r.ok ? r.json() : Promise.reject(r.status))
          .then(gen => { bestOutputIdRef.current = gen.output_id ?? null })
          .catch(() => { bestOutputIdRef.current = null })
          .finally(() => setBestAngleGenerating(false))
        return
      }

      // No strong angles — generate directly
      setFlowState('drafting')
      advanceMicrostate(3)
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: captureId, lens_id: selectedLensId }),
      })
      if (!genRes.ok) throw new Error('Generation failed')
      const genData = await genRes.json()

      const body =
        typeof genData.raw_content === 'string'
          ? genData.raw_content
          : (genData.content as Record<string, unknown>)?.body as string ?? ''

      setDraftLines(body.split('\n\n').filter(Boolean))
      setOutputId(genData.output_id)
      setProgress(100)
      setFlowState('draft_ready')
```

- [ ] **Step 4: Add angle handler functions**

In the `TopicCaptureFlow` component body, before the `return` statements, add:

```ts
  async function handleDraftBest() {
    if (bestOutputIdRef.current) { onComplete(bestOutputIdRef.current); return }
    const maxWait = 30000
    const start = Date.now()
    while (Date.now() - start < maxWait) {
      if (bestOutputIdRef.current) { onComplete(bestOutputIdRef.current); return }
      await new Promise(r => setTimeout(r, 400))
    }
    const msg = 'Draft timed out. Please try again.'
    setErrorMsg(msg)
    setFlowState('error')
    onError(msg)
  }

  async function handleDraftOne(angle: import('@/types/domain').Angle) {
    const captId = captureId
    if (!captId) return
    const groupId = crypto.randomUUID()
    try {
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capture_id: captId,
          lens_id: selectedLensId,
          angle_id: angle.id,
          generation_group_id: groupId,
        }),
      })
      if (!gRes.ok) throw new Error('Generation failed')
      const gen = await gRes.json()
      if (gen.output_id) onComplete(gen.output_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setErrorMsg(msg)
      setFlowState('error')
      onError(msg)
    }
  }

  async function handleDraftAll() {
    const captId = captureId
    if (!captId || angles.length < 2) return
    setDraftAllGenerating(true)
    const groupId = crypto.randomUUID()
    const cap = Math.min(angles.length, 4)
    const results = await Promise.allSettled(
      angles.slice(0, cap).map(angle =>
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_id: captId,
            lens_id: selectedLensId,
            angle_id: angle.id,
            generation_group_id: groupId,
          }),
        }).then(r => r.ok ? r.json() : Promise.reject(r.status))
      )
    )
    const first = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ output_id: string }> | undefined
    setDraftAllGenerating(false)
    if (first?.value?.output_id) onComplete(first.value.output_id)
  }

  function handleSkipAngles() {
    if (bestOutputIdRef.current) {
      onComplete(bestOutputIdRef.current)
    } else {
      setFlowState('draft_ready')
    }
  }
```

- [ ] **Step 5: Add `angles_ready` render block**

In the JSX, between the `researching/drafting` block and the `draft_ready` block, add:

```tsx
  // ── ANGLES READY ────────────────────────────────────────────────────────────
  if (flowState === 'angles_ready') {
    return (
      <div className="py-2">
        <AngleOptions
          angles={angles}
          bestAngleGenerating={bestAngleGenerating}
          draftAllGenerating={draftAllGenerating}
          onDraftBest={handleDraftBest}
          onDraftOne={handleDraftOne}
          onDraftAll={handleDraftAll}
          onSkip={handleSkipAngles}
        />
      </div>
    )
  }
```

- [ ] **Step 6: Add import for AngleOptions**

At the top of the file:
```ts
import { AngleOptions } from '@/components/capture/angle-options'
```

- [ ] **Step 7: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add components/capture/topic-capture-flow.tsx
git commit -m "feat(angle-routing): add angles_ready state to topic-capture-flow"
```

---

## Task 11: Update Studio to group variants by `generation_group_id`

**Files:**
- Modify: `app/(dashboard)/studio/[id]/page.tsx`

Currently the studio loads siblings by `generationId`. When a `generation_group_id` is present on the output, we should use that instead (it groups all angle variants together).

- [ ] **Step 1: Update the variants loading logic**

Find (in the `load()` function):
```ts
      if (data.generationId) {
        const vRes = await fetch(`/api/outputs?generation_id=${data.generationId}`)
        if (vRes.ok) {
          const siblings: Output[] = await vRes.json()
          setVariants(siblings.map((s, i) => ({
            id: s.id,
            label: deriveLabel((s.content as OutputContent & { angle?: string }).angle, i),
            isCurrent: s.id === id,
          })))
        }
      }
```

Replace with:
```ts
      // Group by generation_group_id when present (angle routing), fall back to generationId
      const groupParam = data.generationGroupId
        ? `generation_group_id=${data.generationGroupId}`
        : data.generationId
          ? `generation_id=${data.generationId}`
          : null

      if (groupParam) {
        const vRes = await fetch(`/api/outputs?${groupParam}`)
        if (vRes.ok) {
          const siblings: Output[] = await vRes.json()
          setVariants(siblings.map((s, i) => ({
            id: s.id,
            label: deriveLabel((s.content as OutputContent & { angle?: string }).angle, i),
            isCurrent: s.id === id,
          })))
        }
      }
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit 2>&1 | grep -v "^\.next" | grep -v "^$"
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add "app/(dashboard)/studio/[id]/page.tsx"
git commit -m "feat(angle-routing): studio groups variants by generation_group_id when present"
```

---

## Task 12: Update docs

**Files:**
- Modify: `docs/reliability-status.md`
- Modify: `docs/fixes-applied.md`

- [ ] **Step 1: Add Angle Routing row to `docs/reliability-status.md`**

Add to the table:
```
| Angle routing | GREEN | Extracts 2–4 angles (Haiku). Background-generates strongest. Draft All runs 4x parallel with shared group_id. Silent fallback if extraction returns 0-1 angles. Studio groups sibling variants by generation_group_id. |
```

- [ ] **Step 2: Add entry to `docs/fixes-applied.md`**

```markdown
## Feature: Angle Routing (Release C)

**What:** Voice and Topic captures now extract 2–4 strategically distinct angles via Claude Haiku. If multiple strong angles are found, the flow enters `angles_ready` state: the strongest angle starts generating in the background immediately, and users see an `AngleOptions` card list. "Draft Best Angle" uses the already-running background generation. "Draft All" fires up to 4 parallel generations sharing a `generation_group_id`. Studio groups sibling variants by that ID and shows angle titles as labels in the VariantsRail.

**Files:**

- `supabase/migrations/20260426_angle_routing.sql` — extracted_angles on captures, angle_id + generation_group_id on generations + outputs
- `types/domain.ts` — Angle interface, Capture.extractedAngles, Generation.angleId/generationGroupId, Output.generationGroupId
- `types/db.ts` — corresponding DB type patches
- `lib/ai/generate.ts` — extractAngles() using Haiku
- `lib/domain/capture.ts` — toCapture() maps extractedAngles
- `app/api/capture/[id]/extract-angles/route.ts` — new POST route
- `app/api/generate/route.ts` — angle context injection, stores angle_id + generation_group_id
- `lib/domain/output.ts` — toOutput() maps generationGroupId, adds listOutputsByGroupId()
- `app/api/outputs/route.ts` — supports ?generation_group_id= param
- `components/capture/angle-options.tsx` — angle card list UI
- `components/capture/voice-capture-flow.tsx` — angles_ready state + background gen
- `components/capture/topic-capture-flow.tsx` — angles_ready state + background gen
- `app/(dashboard)/studio/[id]/page.tsx` — groups siblings by generation_group_id

**Confidence:** HIGH
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
git add docs/reliability-status.md docs/fixes-applied.md
git commit -m "docs: mark angle routing GREEN in reliability status"
```

---

## Verification Checklist

Run dev server: `npm run dev` from the project root.

- [ ] **V1: Long voice memo with multiple themes → angles detected**
  Record a 45+ second memo touching 2+ distinct ideas. After processing, `angles_ready` state appears with 2–4 cards.

- [ ] **V2: Topic mode broad request → angles detected**
  Submit: `The future of remote work and its impact on company culture, productivity, and team bonding`. Expect `angles_ready` after research.

- [ ] **V3: Weak single-topic input → no angle routing**
  Submit: `Post about drinking water`. Expect direct `draft_ready` with no `AngleOptions` screen.

- [ ] **V4: Best angle drafts automatically**
  In V1 or V2 scenario: click "Draft Best Angle →". Expect navigation to Studio with a populated draft.

- [ ] **V5: Draft All creates grouped variants**
  Click "Draft All N →". After all complete, navigate to Studio. VariantsRail shows all angle variants with their titles as labels.

- [ ] **V6: Studio sibling switcher shows variants**
  From any angle-routed output in Studio, the VariantsRail (left column) shows multiple buttons labelled with angle titles. Clicking one navigates to that sibling.

- [ ] **V7: No regression — topic mode baseline**
  Submit a focused topic. If extraction returns 0–1 angles, flow proceeds directly to `draft_ready` as before.

- [ ] **V8: No regression — voice baseline**
  Record a short, single-topic memo. Expect direct `draft_ready` without angle screen.

- [ ] **V9: typecheck clean**
  `npx tsc --noEmit` → 0 errors.

---

## Spec Coverage

| Spec requirement | Task | Status |
|----------------|------|--------|
| Angle extraction pipeline | Task 4 + 5 | ✅ |
| Smart branching Voice + Topic | Task 9 + 10 | ✅ |
| Angle selection screen (AngleOptions) | Task 8 | ✅ |
| Draft strongest automatically (background gen) | Task 9 + 10 | ✅ |
| Optional Draft All workflow (≤4, parallel, shared group_id) | Task 9 + 10 | ✅ |
| Studio sibling variants switcher | Task 7 + 11 | ✅ |
| DB: captured.extracted_angles | Task 1 + 3 | ✅ |
| DB: generations.angle_id + generation_group_id | Task 1 + 3 | ✅ |
| DB: index on generation_group_id | Task 1 | ✅ |
| Angle quality rules (2+ distinct or empty array) | Task 4 | ✅ |
| Silent fallback on extraction fail/empty | Task 9 + 10 | ✅ |
| Speed > feature purity | Tasks 9 + 10 (all try/catch fallback) | ✅ |
