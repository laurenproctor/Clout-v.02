# Visuals Tab — Strategic Visual Communication

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Visuals" tab to the studio editor's right panel that lets users generate brand-aligned editorial visuals with full strategic control (objective, audience frame, tone, key idea, directional refinement).

**Architecture:** New `VisualsTab` orchestrator component + `VisualControls` form + `VisualContext` collapsible live in `components/studio/`. Three new API routes (assets GET, sessions GET/POST, generate PATCH) connect to a new versioned `visual_generation_sessions` DB table. The existing `POST /api/visual/generate` gets three new fields (`visualObjective`, `audienceFrame`, `lensContext`) that flow through `generateImage` → `generateVisualIntent` → Claude. Settings persist in localStorage (cache) + DB (canonical).

**Tech Stack:** Next.js App Router, Supabase, Vitest, TypeScript, Tailwind CSS, OpenAI gpt-image-1 (already wired)

**Spec:** `docs/superpowers/specs/2026-05-21-image-generation-studio-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260521000000_visual_generation_sessions.sql` | DB table |
| Create | `app/api/visual/assets/route.ts` | GET assets by outputId |
| Create | `app/api/visual/sessions/route.ts` | GET active session / POST new versioned session |
| Modify | `app/api/visual/generate/route.ts` | Accept 3 new fields + rate limiting |
| Modify | `lib/visual/types/visual.ts` | Extend `GenerateImageInput` |
| Modify | `lib/visual/generation/generateVisualIntent.ts` | Extend input type + inject new context into Claude prompt |
| Modify | `lib/visual/generation/generateImage.ts` | Forward new fields to `generateVisualIntent` |
| Create | `lib/visual/generation/deriveVisualContext.ts` | Pure fn: `VisualIntent` → readable summary string |
| Create | `lib/visual/generation/deriveVisualContext.test.ts` | Vitest unit tests |
| Create | `components/studio/visual-context.tsx` | Collapsible Visual Context section |
| Create | `components/studio/visual-controls.tsx` | Form controls (objective, audience, tone, idea, settings accordion) |
| Create | `components/studio/visuals-tab.tsx` | Tab orchestrator: state, AbortController, API calls, persistence |
| Modify | `app/(dashboard)/studio/[id]/page.tsx` | Add "Visuals" tab to right panel |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260521000000_visual_generation_sessions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260521000000_visual_generation_sessions.sql
create table if not exists visual_generation_sessions (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  output_id         uuid not null references outputs(id) on delete cascade,
  parent_session_id uuid references visual_generation_sessions(id),
  version           integer not null default 1,
  is_active         boolean not null default true,
  aspect_ratio      text not null default 'landscape',
  quality           text not null default 'standard',
  visual_objective  text,
  audience_frame    text,
  emotional_tone    text,
  key_idea          text,
  generation_mode   text,
  created_at        timestamptz not null default now()
);

create index on visual_generation_sessions(output_id, is_active);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

If you're on a remote project (not local Docker), use:

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

Expected output: `Applying migration 20260521000000_visual_generation_sessions.sql`

- [ ] **Step 3: Regenerate TypeScript types**

```bash
npx supabase gen types typescript --local --schema public > types/db.ts
```

If using remote: `npx supabase gen types typescript --project-id <your-project-id> > types/db.ts`

Verify `types/db.ts` now contains a `visual_generation_sessions` entry under `Tables`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521000000_visual_generation_sessions.sql types/db.ts
git commit -m "feat: add visual_generation_sessions table (versioned, append-only)"
```

---

## Task 2: GET /api/visual/assets Route

**Files:**
- Create: `app/api/visual/assets/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/visual/assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const outputId = req.nextUrl.searchParams.get('outputId')
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('visual_assets')
    .select('id, output_id, original_url, aspect_ratio, mode, render_mode, visual_intent, prompt, created_at')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Smoke test manually**

Start the dev server (`npm run dev`) and run:

```bash
curl -s "http://localhost:3000/api/visual/assets?outputId=SOME_OUTPUT_ID" \
  -H "Cookie: <your session cookie>" | jq '.[0].id'
```

Expected: the most recent asset id for that output (or `null` / empty array if none exist).

- [ ] **Step 3: Commit**

```bash
git add app/api/visual/assets/route.ts
git commit -m "feat: add GET /api/visual/assets?outputId route"
```

---

## Task 3: GET + POST /api/visual/sessions Routes

**Files:**
- Create: `app/api/visual/sessions/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/visual/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const outputId = req.nextUrl.searchParams.get('outputId')
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('visual_generation_sessions')
    .select('*')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { outputId, aspectRatio, quality, visualObjective, audienceFrame, emotionalTone, keyIdea, generationMode } = body as {
    outputId: string
    aspectRatio?: string
    quality?: string
    visualObjective?: string
    audienceFrame?: string
    emotionalTone?: string
    keyIdea?: string
    generationMode?: string
  }

  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const supabase = await createClient()

  // Get current max version and active session id for this output
  const { data: existing } = await supabase
    .from('visual_generation_sessions')
    .select('id, version')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Deactivate all existing sessions for this output
  await supabase
    .from('visual_generation_sessions')
    .update({ is_active: false })
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)

  // Insert new versioned session
  const { data, error } = await supabase
    .from('visual_generation_sessions')
    .insert({
      workspace_id:      session.workspaceId,
      output_id:         outputId,
      parent_session_id: existing?.id ?? null,
      version:           (existing?.version ?? 0) + 1,
      is_active:         true,
      aspect_ratio:      aspectRatio ?? 'landscape',
      quality:           quality ?? 'standard',
      visual_objective:  visualObjective ?? null,
      audience_frame:    audienceFrame ?? null,
      emotional_tone:    emotionalTone ?? null,
      key_idea:          keyIdea ?? null,
      generation_mode:   generationMode ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Smoke test GET (empty)**

```bash
curl -s "http://localhost:3000/api/visual/sessions?outputId=SOME_OUTPUT_ID" \
  -H "Cookie: <session>" | jq .
```

Expected: `null` (no session exists yet)

- [ ] **Step 3: Smoke test POST**

```bash
curl -s -X POST "http://localhost:3000/api/visual/sessions" \
  -H "Cookie: <session>" \
  -H "Content-Type: application/json" \
  -d '{"outputId":"SOME_OUTPUT_ID","aspectRatio":"landscape","quality":"standard","visualObjective":"authority"}' | jq .version
```

Expected: `1`

Run again — expected: `2` (versioned)

- [ ] **Step 4: Commit**

```bash
git add app/api/visual/sessions/route.ts
git commit -m "feat: add GET+POST /api/visual/sessions (versioned, append-only)"
```

---

## Task 4: Extend generateVisualIntent With New Context Fields

**Files:**
- Modify: `lib/visual/generation/generateVisualIntent.ts`

- [ ] **Step 1: Extend `GenerateVisualIntentInput`**

Find the existing interface (around line 29):

```ts
export interface GenerateVisualIntentInput {
  content: string
  platform: VisualPlatform
  emotionalTone?: string
  keyIdea?: string
  brandProfile?: BrandSemanticProfile
}
```

Replace it with:

```ts
export type VisualObjective =
  | 'authority'
  | 'education'
  | 'conversation'
  | 'engagement'
  | 'emotional_resonance'
  | 'lead_generation'

export type LensType = 'framework' | 'authority' | 'signal'

export interface GenerateVisualIntentInput {
  content: string
  platform: VisualPlatform
  emotionalTone?: string
  keyIdea?: string
  brandProfile?: BrandSemanticProfile
  visualObjective?: VisualObjective
  audienceFrame?: string
  lensType?: LensType
}
```

- [ ] **Step 2: Destructure the new fields in the function body**

Find this line in `generateVisualIntent`:

```ts
const { content, platform, emotionalTone, keyIdea, brandProfile } = input
```

Replace with:

```ts
const { content, platform, emotionalTone, keyIdea, brandProfile, visualObjective, audienceFrame, lensType } = input
```

- [ ] **Step 3: Inject new context sections into the user message**

Find the block that pushes `keyIdea`:

```ts
  if (keyIdea) {
    lines.push('## Core idea to express visually')
    lines.push(keyIdea)
    lines.push('')
  }
```

Add the following three blocks immediately after it (before the `brandProfile` block):

```ts
  if (visualObjective) {
    const objectiveGuidance: Record<string, string> = {
      authority:          'Establish authority — favor restrained, institutional visual language; credibility-first composition; editorial weight',
      education:          'Educate — favor structured, clear composition that guides the eye through information; diagrammatic clarity',
      conversation:       'Drive conversation — favor thought-provoking tension, open-ended visuals that invite reaction; visual ambiguity that sparks interpretation',
      engagement:         'Increase engagement — favor scroll-stopping contrast, clear focal hierarchy, immediate visual payoff',
      emotional_resonance:'Emotional resonance — favor human presence, warmth, intimate scale; prioritize viewer emotion over information density',
      lead_generation:    'Generate leads — favor aspirational imagery with clear value signal; professional credibility; premium editorial feel',
    }
    lines.push('## Strategic visual objective')
    lines.push(objectiveGuidance[visualObjective] ?? visualObjective)
    lines.push('')
  }

  if (audienceFrame) {
    lines.push('## Target audience')
    lines.push(`This visual is for: ${audienceFrame}`)
    lines.push('Adjust composition density, typography tendency, realism, symbolism, and color restraint for this audience.')
    lines.push('')
  }

  if (lensType) {
    const lensGuidance: Record<string, string> = {
      framework: 'Framework lens active — favor cleaner, more conceptual, structured, sparse composition; ideas over aesthetics',
      authority:  'Authority lens active — favor restrained, editorial, institutional composition; credibility-first visual language',
      signal:     'Signal lens active — favor culturally timely, faster visual pacing, socially native composition',
    }
    lines.push('## Creator lens context')
    lines.push(lensGuidance[lensType])
    lines.push('')
  }
```

- [ ] **Step 4: Run the TypeScript compiler to verify no type errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/visual/generation/generateVisualIntent.ts
git commit -m "feat: extend generateVisualIntent with visualObjective, audienceFrame, lensType"
```

---

## Task 5: Extend GenerateImageInput Type and generateImage Function

**Files:**
- Modify: `lib/visual/types/visual.ts`
- Modify: `lib/visual/generation/generateImage.ts`

- [ ] **Step 1: Extend `GenerateImageInput` in `lib/visual/types/visual.ts`**

Find the `GenerateImageInput` interface and add three fields at the end (before the closing `}`):

```ts
  visualObjective?: string
  audienceFrame?: string
  lensType?: string
```

- [ ] **Step 2: Forward new fields in `generateImage`**

In `lib/visual/generation/generateImage.ts`, find the destructuring of `input` near line 42:

```ts
  const {
    mode,
    workspaceId,
    outputId,
    parentAssetId,
    variationReason,
    content,
    platform,
    emotionalTone,
    keyIdea,
    brandProfile,
    promptOverride,
    visualIntent: intentOverride,
    aspectRatio = 'landscape',
    quality = 'standard',
    seed,
  } = input
```

Add `visualObjective`, `audienceFrame`, `lensType` to the destructuring:

```ts
  const {
    mode,
    workspaceId,
    outputId,
    parentAssetId,
    variationReason,
    content,
    platform,
    emotionalTone,
    keyIdea,
    visualObjective,
    audienceFrame,
    lensType,
    brandProfile,
    promptOverride,
    visualIntent: intentOverride,
    aspectRatio = 'landscape',
    quality = 'standard',
    seed,
  } = input
```

- [ ] **Step 3: Pass new fields to `generateVisualIntent`**

Find the `generateVisualIntent` call in `generateImage.ts`. It currently looks like:

```ts
const { intent } = await generateVisualIntent({
  content: content!,
  platform: platform!,
  emotionalTone,
  keyIdea,
  brandProfile: semanticProfile ?? undefined,
})
```

Replace with:

```ts
const { intent } = await generateVisualIntent({
  content: content!,
  platform: platform!,
  emotionalTone,
  keyIdea,
  brandProfile: semanticProfile ?? undefined,
  visualObjective: visualObjective as import('./generateVisualIntent').VisualObjective | undefined,
  audienceFrame,
  lensType: lensType as import('./generateVisualIntent').LensType | undefined,
})
```

- [ ] **Step 4: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/visual/types/visual.ts lib/visual/generation/generateImage.ts
git commit -m "feat: forward visualObjective, audienceFrame, lensType into VisualIntent compiler"
```

---

## Task 6: Update POST /api/visual/generate (New Fields + Rate Limiting)

**Files:**
- Modify: `app/api/visual/generate/route.ts`

- [ ] **Step 1: Add in-memory rate limiter above the route handler**

Open `app/api/visual/generate/route.ts`. Add this block immediately after the imports, before `export const maxDuration`:

```ts
// ── Rate limiting (in-memory, per-workspace) ─────────────────────────────
type RateBucket = { count: number; windowStart: number }
const standardBuckets = new Map<string, RateBucket>()
const hdBuckets        = new Map<string, RateBucket>()

function isRateLimited(map: Map<string, RateBucket>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const b   = map.get(key)
  if (!b || now - b.windowStart > windowMs) {
    map.set(key, { count: 1, windowStart: now })
    return false
  }
  if (b.count >= max) return true
  b.count++
  return false
}
```

- [ ] **Step 2: Accept and destructure three new fields in the POST handler**

Find the destructuring in the POST body parsing block. It currently ends with `seed`. Add `visualObjective`, `audienceFrame`, `lensType`:

```ts
  const {
    outputId,
    content,
    platform,
    aspectRatio = 'landscape',
    quality = 'standard',
    promptOverride,
    emotionalTone,
    keyIdea,
    parentAssetId,
    generationGroupId,
    variationReason,
    seed,
    visualObjective,
    audienceFrame,
    lensType,
  } = body as {
    outputId?:          string
    content?:           string
    platform?:          string
    aspectRatio?:       string
    quality?:           'standard' | 'hd'
    promptOverride?:    string
    emotionalTone?:     string
    keyIdea?:           string
    parentAssetId?:     string
    generationGroupId?: string
    variationReason?:   string
    seed?:              number
    visualObjective?:   string
    audienceFrame?:     string
    lensType?:          string
  }
```

- [ ] **Step 3: Apply rate limit checks after auth, before validation**

Add these checks immediately after the session guard, before the `promptOverride` validation block:

```ts
  // ── Rate limiting ──────────────────────────────────────────────────────
  if (isRateLimited(standardBuckets, session.workspaceId, 10_000, 1)) {
    return NextResponse.json(
      { error: 'Give it a moment before building another direction.' },
      { status: 429 }
    )
  }
  if (quality === 'hd' && isRateLimited(hdBuckets, session.workspaceId, 3_600_000, 5)) {
    return NextResponse.json(
      { error: 'HD generation limit reached. Try again in an hour.' },
      { status: 429 }
    )
  }
```

- [ ] **Step 4: Forward new fields to `generateImage`**

Find the `generateImage(...)` call near the bottom of the handler. Add the three new fields:

```ts
    const asset = await generateImage({
      mode,
      workspaceId:        session.workspaceId,
      outputId:           outputId ?? undefined,
      parentAssetId:      parentAssetId ?? undefined,
      generationGroupId:  generationGroupId ?? undefined,
      variationReason:    variationReason ?? undefined,
      content,
      platform:           platform as VisualPlatform | undefined,
      aspectRatio:        aspectRatio as AspectRatio,
      quality,
      emotionalTone,
      keyIdea,
      promptOverride,
      seed,
      visualObjective,
      audienceFrame,
      lensType,
    })
```

- [ ] **Step 5: Add generation logging**

Add this line immediately before the `return NextResponse.json(...)` success response:

```ts
    console.info('[visual/generate] generated', {
      workspaceId: session.workspaceId,
      outputId,
      quality,
      mode,
      visualObjective,
      audienceFrame,
      lensType,
    })
```

- [ ] **Step 6: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/visual/generate/route.ts
git commit -m "feat: add visualObjective/audienceFrame/lensType to generate route + rate limiting"
```

---

## Task 7: deriveVisualContext Utility + VisualContext Component

**Files:**
- Create: `lib/visual/generation/deriveVisualContext.ts`
- Create: `lib/visual/generation/deriveVisualContext.test.ts`
- Create: `components/studio/visual-context.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// lib/visual/generation/deriveVisualContext.test.ts
import { describe, it, expect } from 'vitest'
import { deriveVisualContext } from './deriveVisualContext'
import type { VisualIntent } from '../types/visual'

const baseIntent: VisualIntent = {
  attentionStrategy: 'contrast',
  viewerEmotion: 'quiet confidence',
  visualConcept: 'A lone architect reviewing blueprints in a glass office at dusk',
  compositionStyle: 'rule of thirds with generous negative space',
  colorMood: 'deep navy and cool steel, warm amber accent',
  lightingStyle: 'soft diffused window light from the left',
  visualDensity: 'minimal',
  overlayRecommendation: 'none',
  renderMode: 'fully-generated',
  creativeRisk: 'balanced',
  platformRationale: 'editorial restraint performs well on LinkedIn',
  negativeSpace: ['clutter', 'busy backgrounds'],
}

describe('deriveVisualContext', () => {
  it('returns a non-empty string', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('includes composition style', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toContain('rule of thirds')
  })

  it('includes color mood', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toContain('deep navy')
  })

  it('includes viewer emotion', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).toContain('quiet confidence')
  })

  it('includes brand archetype when provided', () => {
    const result = deriveVisualContext(baseIntent, 'Editorial Luxury')
    expect(result).toContain('Editorial Luxury')
  })

  it('does not include raw prompts or technical fields', () => {
    const result = deriveVisualContext(baseIntent)
    expect(result).not.toContain('fully-generated')
    expect(result).not.toContain('platformRationale')
    expect(result).not.toContain('negativeSpace')
  })
})
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npx vitest run lib/visual/generation/deriveVisualContext.test.ts
```

Expected: FAIL — `Cannot find module './deriveVisualContext'`

- [ ] **Step 3: Implement `deriveVisualContext`**

```ts
// lib/visual/generation/deriveVisualContext.ts
import type { VisualIntent } from '../types/visual'

export function deriveVisualContext(intent: VisualIntent, brandArchetype?: string): string {
  const parts: string[] = []

  if (brandArchetype) parts.push(`${brandArchetype} visual style`)

  if (intent.compositionStyle) parts.push(intent.compositionStyle)
  if (intent.lightingStyle)    parts.push(intent.lightingStyle)
  if (intent.colorMood)        parts.push(intent.colorMood)

  const densityLabel = intent.visualDensity === 'minimal'  ? 'generous negative space'
                     : intent.visualDensity === 'dense'    ? 'layered composition'
                     : 'balanced composition'
  parts.push(densityLabel)

  if (intent.viewerEmotion) parts.push(`Viewer emotion: ${intent.viewerEmotion}`)

  return parts.filter(Boolean).join('. ') + '.'
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run lib/visual/generation/deriveVisualContext.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Create the VisualContext component**

```tsx
// components/studio/visual-context.tsx
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deriveVisualContext } from '@/lib/visual/generation/deriveVisualContext'
import type { VisualIntent } from '@/lib/visual/types/visual'

interface VisualContextProps {
  intent: VisualIntent
  brandArchetype?: string
  className?: string
}

export function VisualContext({ intent, brandArchetype, className }: VisualContextProps) {
  const [open, setOpen] = useState(false)
  const summary = deriveVisualContext(intent, brandArchetype)

  return (
    <div className={cn('border-t border-zinc-800/60', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-500 transition-colors">
          Visual Context
        </span>
        <ChevronDown className={cn('h-3 w-3 text-zinc-700 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="px-4 pb-3 text-[11px] leading-relaxed text-zinc-500">
          {summary}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/visual/generation/deriveVisualContext.ts lib/visual/generation/deriveVisualContext.test.ts components/studio/visual-context.tsx
git commit -m "feat: add deriveVisualContext utility + VisualContext collapsible component"
```

---

## Task 8: VisualControls Component

**Files:**
- Create: `components/studio/visual-controls.tsx`

- [ ] **Step 1: Define the types and create the component**

```tsx
// components/studio/visual-controls.tsx
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VisualObjective =
  | 'authority'
  | 'education'
  | 'conversation'
  | 'engagement'
  | 'emotional_resonance'
  | 'lead_generation'

export type AspectRatio = 'square' | 'landscape' | 'portrait'
export type Quality = 'standard' | 'hd'

const OBJECTIVE_LABELS: { value: VisualObjective; label: string }[] = [
  { value: 'authority',          label: 'Establish Authority' },
  { value: 'education',          label: 'Educate' },
  { value: 'conversation',       label: 'Drive Conversation' },
  { value: 'engagement',         label: 'Increase Shares' },
  { value: 'emotional_resonance',label: 'Emotional Reaction' },
  { value: 'lead_generation',    label: 'Generate Leads' },
]

const AUDIENCE_SUGGESTIONS = [
  'Executives', 'Engineers', 'Investors', 'Consumers',
  'Operators', 'Developers', 'Journalists', 'Creators', 'General Public',
]

export interface VisualControlsValue {
  visualObjective: VisualObjective | null
  audienceFrame: string
  emotionalTone: string
  keyIdea: string
  aspectRatio: AspectRatio
  quality: Quality
  promptOverride: string
}

interface VisualControlsProps {
  value: VisualControlsValue
  onChange: (next: VisualControlsValue) => void
  disabled?: boolean
}

export function VisualControls({ value, onChange, disabled }: VisualControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showAudienceSuggestions, setShowAudienceSuggestions] = useState(false)

  function set<K extends keyof VisualControlsValue>(key: K, val: VisualControlsValue[K]) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Objective */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
          Visual Objective
        </p>
        <div className="flex flex-wrap gap-1.5">
          {OBJECTIVE_LABELS.map(({ value: v, label }) => (
            <button
              key={v}
              disabled={disabled}
              onClick={() => set('visualObjective', value.visualObjective === v ? null : v)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors',
                value.visualObjective === v
                  ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
                  : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300',
                disabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Audience Frame */}
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
          Audience Frame <span className="font-normal normal-case tracking-normal text-zinc-700">optional</span>
        </p>
        <input
          type="text"
          placeholder="e.g. Executives, Engineers, Investors"
          value={value.audienceFrame}
          disabled={disabled}
          onFocus={() => setShowAudienceSuggestions(true)}
          onBlur={() => setTimeout(() => setShowAudienceSuggestions(false), 150)}
          onChange={e => set('audienceFrame', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 disabled:opacity-40"
        />
        {showAudienceSuggestions && !value.audienceFrame && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden shadow-xl">
            {AUDIENCE_SUGGESTIONS.map(s => (
              <button
                key={s}
                onMouseDown={() => set('audienceFrame', s)}
                className="block w-full text-left px-3 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Emotional Tone */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
          Emotional Tone <span className="font-normal normal-case tracking-normal text-zinc-700">optional</span>
        </p>
        <input
          type="text"
          placeholder="e.g. contemplative, urgent, hopeful"
          value={value.emotionalTone}
          disabled={disabled}
          onChange={e => set('emotionalTone', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 disabled:opacity-40"
        />
      </div>

      {/* Key Idea */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
          Key Idea <span className="font-normal normal-case tracking-normal text-zinc-700">optional</span>
        </p>
        <input
          type="text"
          placeholder="e.g. the tension between speed and depth"
          value={value.keyIdea}
          disabled={disabled}
          onChange={e => set('keyIdea', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 disabled:opacity-40"
        />
      </div>

      {/* Visual Settings accordion */}
      <div className="border border-zinc-800 rounded-md overflow-hidden">
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="text-[11px] font-medium text-zinc-500">Visual Settings</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-zinc-700 transition-transform', settingsOpen && 'rotate-180')} />
        </button>

        {settingsOpen && (
          <div className="border-t border-zinc-800 px-3 pb-3 pt-2.5 flex flex-col gap-3">
            {/* Aspect Ratio */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">Aspect Ratio</p>
              <div className="flex rounded-md border border-zinc-800 overflow-hidden">
                {(['square', 'landscape', 'portrait'] as AspectRatio[]).map(r => (
                  <button
                    key={r}
                    disabled={disabled}
                    onClick={() => set('aspectRatio', r)}
                    className={cn(
                      'flex-1 py-1.5 text-[11px] capitalize border-r border-zinc-800 last:border-r-0 transition-colors',
                      value.aspectRatio === r ? 'bg-zinc-700 text-zinc-100 font-semibold' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">Quality</p>
              <div className="flex rounded-md border border-zinc-800 overflow-hidden">
                {(['standard', 'hd'] as Quality[]).map(q => (
                  <button
                    key={q}
                    disabled={disabled}
                    onClick={() => set('quality', q)}
                    className={cn(
                      'flex-1 py-1.5 text-[11px] uppercase tracking-wide border-r border-zinc-800 last:border-r-0 transition-colors',
                      value.quality === q ? 'bg-zinc-700 text-zinc-100 font-semibold' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt override */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5">
                Prompt Override <span className="font-normal normal-case tracking-normal text-zinc-700">advanced</span>
              </p>
              <textarea
                rows={3}
                placeholder="Write a full prompt to bypass brand-aware generation entirely."
                value={value.promptOverride}
                disabled={disabled}
                onChange={e => set('promptOverride', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-[11px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 resize-none disabled:opacity-40 leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/studio/visual-controls.tsx
git commit -m "feat: add VisualControls component with full editorial control panel"
```

---

## Task 9: VisualsTab Component

**Files:**
- Create: `components/studio/visuals-tab.tsx`

The tab owns all state, API calls, localStorage caching, and AbortController lifecycle.

- [ ] **Step 1: Create the component**

```tsx
// components/studio/visuals-tab.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { VisualControls, type VisualControlsValue } from './visual-controls'
import { VisualContext } from './visual-context'
import type { VisualIntent } from '@/lib/visual/types/visual'

// ── Types ───────────────────────────────────────────────────────────────────

interface GeneratedAsset {
  assetId: string
  url: string
  aspectRatio: string
  mode: string
  visualIntent: VisualIntent | null
  prompt: string
}

interface StoredAsset {
  id: string
  original_url: string
  aspect_ratio: string
  mode: string
  visual_intent: VisualIntent | null
  prompt: string
}

interface VisualsTabProps {
  outputId: string
  content: string
  platform: string
}

// ── Refinement presets ───────────────────────────────────────────────────────

const REFINEMENT_PRESETS = [
  { label: 'More Editorial',    reason: 'Raise formality and editorial weight. Favor asymmetric tension, restrained palette, institutional visual language. Reduce warmth and consumer cues.' },
  { label: 'More Minimal',      reason: 'Increase negative space dramatically. Reduce visual elements to a single clear focal point. Flatten and desaturate the palette.' },
  { label: 'More Emotional',    reason: 'Shift toward warmer color, softer light, and implied human presence or intimacy. Prioritize viewer emotion over information.' },
  { label: 'More Abstract',     reason: 'Move away from literal representation toward texture, form, and geometry. Reduce narrative specificity.' },
  { label: 'More Technical',    reason: 'Favor precision composition, cooler palette, structured grid, diagrammatic clarity, and authoritative visual weight.' },
  { label: 'More Branded',      reason: 'Increase alignment to brand color and tone tokens. Bring primary and accent colors to the foreground. Strengthen brand archetype.' },
  { label: 'More Social Native', reason: 'Improve scroll interruption through focal clarity, pacing, and contrast hierarchy. Stay editorial — avoid trend aesthetics, meme visuals, or hyper-saturation.' },
]

// ── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = (id: string) => `clout:visuals-settings:${id}`

const DEFAULT_CONTROLS: VisualControlsValue = {
  visualObjective: null,
  audienceFrame:   '',
  emotionalTone:   '',
  keyIdea:         '',
  aspectRatio:     'landscape',
  quality:         'standard',
  promptOverride:  '',
}

function loadFromStorage(outputId: string): VisualControlsValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(outputId))
    if (!raw) return DEFAULT_CONTROLS
    return { ...DEFAULT_CONTROLS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONTROLS
  }
}

function saveToStorage(outputId: string, v: VisualControlsValue) {
  try { localStorage.setItem(STORAGE_KEY(outputId), JSON.stringify(v)) } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────────────────────

export function VisualsTab({ outputId, content, platform }: VisualsTabProps) {
  const [controls, setControls] = useState<VisualControlsValue>(() => loadFromStorage(outputId))
  const [asset,    setAsset]    = useState<GeneratedAsset | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [error,    setError]    = useState<{ message: string; type: 'policy' | 'rate' | 'server' } | null>(null)

  const controllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => () => { controllerRef.current?.abort() }, [])

  // Load existing asset + DB session on mount
  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch(`/api/visual/assets?outputId=${outputId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/visual/sessions?outputId=${outputId}`).then(r => r.ok ? r.json() : null),
    ]).then(([assets, session]: [StoredAsset[], Record<string, unknown> | null]) => {
      if (cancelled) return

      // Show most recent existing asset
      const latest = assets[0]
      if (latest) {
        setAsset({
          assetId:      latest.id,
          url:          latest.original_url,
          aspectRatio:  latest.aspect_ratio,
          mode:         latest.mode,
          visualIntent: latest.visual_intent,
          prompt:       latest.prompt,
        })
      }

      // Overwrite controls with DB-canonical session (DB wins over localStorage)
      if (session) {
        const fromDb: Partial<VisualControlsValue> = {
          visualObjective: (session.visual_objective as VisualControlsValue['visualObjective']) ?? null,
          audienceFrame:   (session.audience_frame  as string) ?? '',
          emotionalTone:   (session.emotional_tone  as string) ?? '',
          keyIdea:         (session.key_idea        as string) ?? '',
          aspectRatio:     (session.aspect_ratio    as VisualControlsValue['aspectRatio']) ?? 'landscape',
          quality:         (session.quality         as VisualControlsValue['quality']) ?? 'standard',
        }
        setControls(prev => ({ ...prev, ...fromDb }))
      }
    })

    return () => { cancelled = true }
  }, [outputId])

  const generate = useCallback(async (opts: { parentAssetId?: string; variationReason?: string } = {}) => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        outputId,
        content,
        platform:         platform || 'linkedin',
        aspectRatio:      controls.aspectRatio,
        quality:          controls.quality,
        visualObjective:  controls.visualObjective ?? undefined,
        audienceFrame:    controls.audienceFrame   || undefined,
        emotionalTone:    controls.emotionalTone   || undefined,
        keyIdea:          controls.keyIdea         || undefined,
        promptOverride:   controls.promptOverride  || undefined,
        ...opts,
      }

      const res = await fetch('/api/visual/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controllerRef.current.signal,
      })

      const json = await res.json()

      if (!res.ok) {
        const type = res.status === 422 ? 'policy'
                   : res.status === 429 ? 'rate'
                   : 'server'
        setError({ message: json.error ?? 'Generation failed.', type })
        return
      }

      setAsset({
        assetId:      json.assetId,
        url:          json.url,
        aspectRatio:  json.aspectRatio,
        mode:         json.mode,
        visualIntent: json.visualIntent ?? null,
        prompt:       json.prompt ?? '',
      })

      // Persist settings (only on successful generation, not on directional refinements)
      if (!opts.parentAssetId) {
        saveToStorage(outputId, controls)
        fetch('/api/visual/sessions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            outputId,
            aspectRatio:     controls.aspectRatio,
            quality:         controls.quality,
            visualObjective: controls.visualObjective,
            audienceFrame:   controls.audienceFrame   || null,
            emotionalTone:   controls.emotionalTone   || null,
            keyIdea:         controls.keyIdea         || null,
            generationMode:  json.mode,
          }),
        }).catch(() => { /* non-blocking */ })
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // cancelled — no state change
      setError({ message: 'Something went wrong. Try again.', type: 'server' })
    } finally {
      setLoading(false)
      // 3-second client-side cooldown
      setCooldown(true)
      setTimeout(() => setCooldown(false), 3000)
    }
  }, [outputId, content, platform, controls])

  const refine = useCallback((preset: typeof REFINEMENT_PRESETS[number]) => {
    if (!asset) return
    generate({ parentAssetId: asset.assetId, variationReason: preset.reason })
  }, [asset, generate])

  const disabled = loading || cooldown

  return (
    <div className="flex flex-col gap-0 overflow-y-auto flex-1">

      {/* ── Image display ─────────────────────────────────────────────── */}
      <div className="relative mx-4 mt-4 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0" style={{ aspectRatio: '16/9' }}>
        {asset ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt="Generated visual"
              className={cn('w-full h-full object-cover transition-all duration-500', loading && 'blur-sm scale-105')}
            />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60">
                <div className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin mb-2" />
                <p className="text-[11px] text-zinc-400">Building visual direction…</p>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900">
            {loading ? (
              <>
                <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
                <p className="text-[11px] text-zinc-500">Building visual direction…</p>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">✦</div>
                <p className="text-[11px] text-zinc-600 text-center px-6 leading-relaxed">
                  Shape how your ideas are perceived
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Error state ────────────────────────────────────────────────── */}
      {error && (
        <div className={cn(
          'mx-4 mt-2 rounded-md px-3 py-2 text-[11px] leading-relaxed',
          error.type === 'policy' && 'bg-amber-950/40 border border-amber-800/50 text-amber-400',
          error.type === 'rate'   && 'bg-zinc-900 border border-zinc-800 text-zinc-500',
          error.type === 'server' && 'bg-red-950/40 border border-red-800/50 text-red-400',
        )}>
          {error.message}
          {error.type === 'server' && (
            <button onClick={() => generate()} className="ml-2 underline underline-offset-2 hover:no-underline">
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── Visual Context ──────────────────────────────────────────────── */}
      {asset?.visualIntent && (
        <VisualContext intent={asset.visualIntent} className="mx-4 mt-3" />
      )}

      {/* ── Directional refinement presets ─────────────────────────────── */}
      {asset && (
        <div className="mx-4 mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {REFINEMENT_PRESETS.map(p => (
              <button
                key={p.label}
                disabled={disabled}
                onClick={() => refine(p)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            disabled={disabled}
            onClick={() => generate()}
            className={cn(
              'self-start text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            ↺ Rebuild
          </button>
        </div>
      )}

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="mx-4 mt-4 border-t border-zinc-800/60" />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-4">
        <VisualControls value={controls} onChange={setControls} disabled={disabled} />

        {/* CTA */}
        <button
          disabled={disabled}
          onClick={() => generate()}
          className={cn(
            'w-full rounded-lg py-2.5 text-[12px] font-semibold transition-colors',
            'bg-zinc-100 hover:bg-white text-zinc-900',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          {loading ? 'Building visual direction…' : '✦ Build visual direction'}
        </button>
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/studio/visuals-tab.tsx
git commit -m "feat: add VisualsTab orchestrator with full state, loading, refinement, persistence"
```

---

## Task 10: Studio Editor Integration

**Files:**
- Modify: `app/(dashboard)/studio/[id]/page.tsx`

- [ ] **Step 1: Import VisualsTab**

Add to the import block at the top of the file (alongside existing studio imports):

```ts
import { VisualsTab } from '@/components/studio/visuals-tab'
```

- [ ] **Step 2: Add right-panel tab state**

In `StudioEditorPage`, add this state alongside the existing state declarations:

```ts
const [rightTab, setRightTab] = useState<'preview' | 'visuals'>('preview')
```

- [ ] **Step 3: Derive the platform string for the Visuals tab**

Add this derived value in the render section, after `previewPlatform` is derived:

```ts
const visualsPlatform: string = assignedChannel?.platform ?? previewPlatform ?? 'linkedin'
```

- [ ] **Step 4: Replace the right panel with the tabbed version**

Find the right panel block (it starts with `{/* ── Right: platform preview ── */}`). Replace it entirely with:

```tsx
{/* ── Right: preview + visuals tabs ── */}
{showPreviewPanel && (
  <div
    className="hidden lg:flex flex-col flex-shrink-0 border-l border-zinc-800/60 overflow-hidden"
    style={{ width: 320 }}
  >
    {/* Tab bar */}
    <div className="flex flex-shrink-0 border-b border-zinc-800/60">
      <button
        onClick={() => setRightTab('preview')}
        className={cn(
          'flex-1 py-2.5 text-[11px] font-medium text-center transition-colors border-b-2 -mb-px',
          rightTab === 'preview'
            ? 'text-zinc-200 border-zinc-400'
            : 'text-zinc-600 border-transparent hover:text-zinc-400',
        )}
      >
        Preview
      </button>
      <button
        onClick={() => setRightTab('visuals')}
        className={cn(
          'flex-1 py-2.5 text-[11px] font-medium text-center transition-colors border-b-2 -mb-px',
          rightTab === 'visuals'
            ? 'text-zinc-200 border-zinc-400'
            : 'text-zinc-600 border-transparent hover:text-zinc-400',
        )}
      >
        Visuals
      </button>
    </div>

    {/* Preview tab */}
    {rightTab === 'preview' && (
      <div className="flex-1 bg-zinc-50 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">
          {previewAccountName || assignedChannel?.platform || 'Preview'}
        </p>
        <PlatformPreview
          platform={previewPlatform}
          accountName={previewAccountName}
          handle={previewHandle}
          body={previewOutput.body}
          subject={previewOutput.title || undefined}
        />
        {platformTabs.length > 1 && (
          <PlatformTabs
            tabs={platformTabs}
            activeId={activeTabId}
            onSelect={setActiveTabId}
          />
        )}
      </div>
    )}

    {/* Visuals tab */}
    {rightTab === 'visuals' && (
      <VisualsTab
        outputId={id}
        content={body}
        platform={visualsPlatform}
      />
    )}
  </div>
)}
```

Note: if `showPreviewPanel` is false (no channel assigned), the Visuals tab is also hidden. This is intentional — the tab requires at minimum a platform fallback. If you want to show Visuals even without a channel, change the outer condition to always render the right panel and derive `visualsPlatform` from `'linkedin'` as fallback.

- [ ] **Step 5: Verify no type errors and no lint errors**

```bash
npx tsc --noEmit && npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Start the dev server and manually test the golden path**

```bash
npm run dev
```

Open any draft post in the studio editor at `/studio/<id>`. Confirm:

1. Right panel shows "Preview" and "Visuals" tabs
2. Clicking "Visuals" shows the empty state ("Shape how your ideas are perceived")
3. Select a Visual Objective chip and click "Build visual direction" — spinner appears on the image placeholder
4. After ~20–60 seconds, the generated image appears
5. Visual Context section appears collapsed below the image — expand it and confirm human-readable text (not a raw prompt)
6. Directional refinement preset buttons appear — click "More Minimal" and confirm a new image generates
7. Switch to "Preview" tab and back — tab state persists, image is still there
8. Refresh the page — open Visuals tab — confirm controls are pre-populated from localStorage
9. After a second generation, confirm DB session is created (check Supabase studio → `visual_generation_sessions` table)

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/studio/[id]/page.tsx"
git commit -m "feat: add Visuals tab to studio editor right panel"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec requirement | Task |
|---|---|
| "Visuals" tab in right panel | Task 10 |
| VisualsTab / VisualControls naming | Tasks 8, 9, 10 |
| Visual Objective (6 options, segmented) | Task 8 |
| Audience Frame (text + chip suggestions) | Task 8 |
| Emotional Tone, Key Idea | Task 8 |
| Aspect Ratio, Quality in Visual Settings accordion | Task 8 |
| Prompt override in accordion (advanced) | Task 8 |
| Panel hierarchy: image top, context, refinement, controls, CTA | Task 9 |
| Empty state copy: "Shape how your ideas are perceived" | Task 9 |
| Directional refinement 7 presets | Task 9 |
| "More Social Native" editorial constraints | Task 9 (REFINEMENT_PRESETS constant) |
| Loading state: blur/shimmer on prior image | Task 9 |
| "Building visual direction…" copy | Task 9 |
| AbortController cleanup on unmount + tab switch | Task 9 |
| Rate limiting: 1/10s standard, 5/hr HD | Task 6 |
| Client-side 3s cooldown | Task 9 |
| Generation logging | Task 6 |
| Visual Context: derived text, no raw prompt | Tasks 7, 9 |
| Settings: localStorage cache + DB canonical | Tasks 3, 9 |
| visual_generation_sessions versioned/append-only | Tasks 1, 3 |
| visualObjective, audienceFrame, lensType → VisualIntent compiler | Tasks 4, 5, 6 |
| GET /api/visual/assets | Task 2 |
| GET + POST /api/visual/sessions | Task 3 |
| POST /api/visual/generate updated | Task 6 |
| Error states: 422/429/500 with correct copy | Task 9 |

### Notes

- **Lens context (lensType)**: Infrastructure is wired (API accepts it, compiler uses it). The studio page does not yet pass a lens type — that requires fetching the output's generation→lens, which is out of scope. Pass `undefined` for now.
- **showPreviewPanel condition**: If no channel is assigned to the post, the right panel (and Visuals tab) is currently hidden. To always show the right panel, modify the `showPreviewPanel` condition in the studio page.
- **`PlatformTabs` in preview**: The existing `PlatformTabs` component may need to remain inside the preview tab content. Verify its current render location when integrating Task 10.
