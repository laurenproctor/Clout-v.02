# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-step onboarding wizard with a premium 6-step identity-building flow that ends with an AI-generated positioning statement, 3 post ideas, and 1 draft post — so users enter the dashboard having already received value.

**Architecture:** The onboarding page (`app/(auth)/onboarding/page.tsx`) is a client component managing all 6 steps plus a post-submit interstitial state. Each step POSTs to `/api/onboarding` (extended with new step handlers). After step 6, a second POST to `/api/onboarding/generate` calls Claude via the existing `callClaude` helper and stores results in a new `onboarding_generations` table. The dashboard page detects first-visit state via `onboarding_completed_at` on the profile.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Supabase (postgres + RLS), `@anthropic-ai/sdk` via existing `callClaude` helper in `lib/ai/generate.ts`, Clerk auth via `getSession()`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/schema.sql` | Modify | Add new profile columns + `onboarding_generations` table |
| `types/db.ts` | Modify | Add new columns to profiles Row/Insert/Update types; add onboarding_generations types |
| `types/domain.ts` | Modify | Extend `Profile` interface; add `OnboardingGeneration` type |
| `lib/domain/onboarding.ts` | Create | Domain functions: `updateOnboardingStep`, `generateOnboardingContent`, `getOnboardingGeneration` |
| `app/api/onboarding/route.ts` | Modify | Add new step handlers: `identity`, `purpose`, `beliefs`, `channels`, `audience` |
| `app/api/onboarding/generate/route.ts` | Create | POST handler that triggers AI generation and stores result |
| `app/(auth)/onboarding/page.tsx` | Replace | 6-step wizard + split layout + live summary panel + interstitial |
| `app/(dashboard)/page.tsx` | Modify | Welcome banner for first post-onboarding visit |

---

## Task 1: DB Schema — new profile columns + onboarding_generations table

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add new columns to profiles table in schema.sql**

In `supabase/schema.sql`, find the `create table profiles` block (line ~97) and add the new columns **after** `sample_content text[] default '{}'`:

```sql
  purpose                 text,
  role                    text,
  industry                text,
  expertise               text,
  profile_insights        jsonb,
  channels                text[]        default '{}',
  audience_targets        text[]        default '{}',
  audience_perception     text[]        default '{}',
  onboarding_completed_at timestamptz,
```

The full updated `create table profiles` block should look like:

```sql
create table profiles (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references workspaces(id) on delete cascade,
  display_name                    text,
  bio                             text,
  industries                      text[]        default '{}',
  target_audiences                text[]        default '{}',
  tone_notes                      text,
  mental_models                   jsonb         not null default '[]',
  philosophies                    jsonb         not null default '[]',
  sample_content                  text[]        default '{}',
  purpose                         text,
  role                            text,
  industry                        text,
  expertise                       text,
  profile_insights                jsonb,
  channels                        text[]        default '{}',
  audience_targets                text[]        default '{}',
  audience_perception             text[]        default '{}',
  onboarding_completed_at         timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);
```

- [ ] **Step 2: Add onboarding_generations table to schema.sql**

After the `profiles` block (before the `-- SUBSCRIPTIONS` section), add:

```sql
-- ============================================================
-- ONBOARDING GENERATIONS
-- ============================================================
create table onboarding_generations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  positioning   text,
  post_ideas    jsonb not null default '[]',
  draft_post    text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);
create unique index onboarding_generations_workspace_idx on onboarding_generations(workspace_id);

-- RLS
alter table onboarding_generations enable row level security;
create policy "workspace members can read own generation"
  on onboarding_generations for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = onboarding_generations.workspace_id
        and workspace_members.user_id = (
          select id from users where clerk_id = auth.jwt() ->> 'sub'
        )
    )
  );
create policy "service role can manage onboarding_generations"
  on onboarding_generations for all
  using (auth.role() = 'service_role');
```

- [ ] **Step 3: Apply migration via Supabase dashboard**

Go to Supabase Dashboard → SQL Editor and run these statements (the schema changes don't auto-apply):

```sql
-- Add new columns to profiles
alter table profiles
  add column if not exists purpose text,
  add column if not exists role text,
  add column if not exists industry text,
  add column if not exists expertise text,
  add column if not exists profile_insights jsonb,
  add column if not exists channels text[] default '{}',
  add column if not exists audience_targets text[] default '{}',
  add column if not exists audience_perception text[] default '{}',
  add column if not exists onboarding_completed_at timestamptz;

-- Create onboarding_generations table
create table if not exists onboarding_generations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  positioning   text,
  post_ideas    jsonb not null default '[]',
  draft_post    text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

create unique index if not exists onboarding_generations_workspace_idx
  on onboarding_generations(workspace_id);

alter table onboarding_generations enable row level security;

create policy "workspace members can read own generation"
  on onboarding_generations for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = onboarding_generations.workspace_id
        and workspace_members.user_id = (
          select id from users where clerk_id = auth.jwt() ->> 'sub'
        )
    )
  );

create policy "service role can manage onboarding_generations"
  on onboarding_generations for all
  using (auth.role() = 'service_role');
```

- [ ] **Step 4: Commit schema changes**

```bash
git add supabase/schema.sql
git commit -m "feat(db): add onboarding profile columns and onboarding_generations table"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `types/db.ts`
- Modify: `types/domain.ts`

- [ ] **Step 1: Update profiles Row type in types/db.ts**

Find the `profiles` Row block and add the new fields after `sample_content: string[]`:

```typescript
// Add inside profiles.Row:
purpose: string | null
role: string | null
industry: string | null
expertise: string | null
profile_insights: Json | null
channels: string[]
audience_targets: string[]
audience_perception: string[]
onboarding_completed_at: string | null
```

- [ ] **Step 2: Update profiles Insert and Update types in types/db.ts**

In both `profiles.Insert` and `profiles.Update`, add after `sample_content?`:

```typescript
purpose?: string | null
role?: string | null
industry?: string | null
expertise?: string | null
profile_insights?: Json | null
channels?: string[]
audience_targets?: string[]
audience_perception?: string[]
onboarding_completed_at?: string | null
```

- [ ] **Step 3: Add onboarding_generations to db.ts**

In the `Tables` object in `types/db.ts`, add a new entry (alphabetically between `outputs` and `profiles` or at end of the Tables object):

```typescript
onboarding_generations: {
  Row: {
    id: string
    workspace_id: string
    positioning: string | null
    post_ideas: Json
    draft_post: string | null
    status: string
    created_at: string
  }
  Insert: {
    id?: string
    workspace_id: string
    positioning?: string | null
    post_ideas?: Json
    draft_post?: string | null
    status?: string
    created_at?: string
  }
  Update: {
    id?: string
    workspace_id?: string
    positioning?: string | null
    post_ideas?: Json
    draft_post?: string | null
    status?: string
    created_at?: string
  }
}
```

- [ ] **Step 4: Update Profile interface in types/domain.ts**

Find the `Profile` interface and add new fields after `sampleContent`:

```typescript
export interface Profile {
  id: string
  workspaceId: string
  displayName: string | null
  bio: string | null
  industries: string[]
  targetAudiences: string[]
  toneNotes: string | null
  mentalModels: Array<{ name: string; description: string }>
  philosophies: Array<{ name: string; description: string }>
  sampleContent: string[]
  purpose: string | null
  role: string | null
  industry: string | null
  expertise: string | null
  profileInsights: {
    core_belief?: string
    energized_by?: string
    misconceptions?: string
    lessons?: string
  } | null
  channels: string[]
  audienceTargets: string[]
  audiencePerception: string[]
  onboardingCompletedAt: string | null
  privateFeedOperatorVisible: boolean
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 5: Add OnboardingGeneration type to types/domain.ts**

After the `Profile` interface, add:

```typescript
export interface OnboardingGeneration {
  id: string
  workspaceId: string
  positioning: string | null
  postIdeas: Array<{ hook: string; channel: string }>
  draftPost: string | null
  status: 'pending' | 'complete' | 'failed'
  createdAt: string
}
```

- [ ] **Step 6: Commit type changes**

```bash
git add types/db.ts types/domain.ts
git commit -m "feat(types): extend Profile and add OnboardingGeneration types"
```

---

## Task 3: Onboarding Domain Functions

**Files:**
- Create: `lib/domain/onboarding.ts`

- [ ] **Step 1: Create lib/domain/onboarding.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { DomainResult, OnboardingGeneration } from '@/types/domain'

export async function updateOnboardingStep(params: {
  workspaceId: string
  step: 'identity' | 'purpose' | 'beliefs' | 'channels' | 'audience'
  data: Record<string, unknown>
}): Promise<DomainResult<void>> {
  const supabase = await createClient()

  let update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (params.step === 'identity') {
    const { display_name, role, industry, expertise } = params.data as {
      display_name?: string
      role?: string
      industry?: string
      expertise?: string
    }
    if (display_name !== undefined) update.display_name = display_name
    if (role !== undefined) update.role = role
    if (industry !== undefined) update.industry = industry
    if (expertise !== undefined) update.expertise = expertise
  }

  if (params.step === 'purpose') {
    update.purpose = params.data.purpose ?? null
  }

  if (params.step === 'beliefs') {
    update.profile_insights = params.data.profile_insights ?? null
  }

  if (params.step === 'channels') {
    update.channels = params.data.channels ?? []
  }

  if (params.step === 'audience') {
    update.audience_targets = params.data.audience_targets ?? []
    update.audience_perception = params.data.audience_perception ?? []
    update.onboarding_completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('workspace_id', params.workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function createOnboardingGeneration(params: {
  workspaceId: string
}): Promise<DomainResult<{ id: string }>> {
  const supabase = await createClient()

  // Upsert so retries are safe
  const { data, error } = await supabase
    .from('onboarding_generations')
    .upsert(
      { workspace_id: params.workspaceId, status: 'pending' },
      { onConflict: 'workspace_id' }
    )
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to create generation' }
  return { ok: true, data: { id: data.id } }
}

export async function updateOnboardingGeneration(params: {
  workspaceId: string
  positioning: string
  postIdeas: Array<{ hook: string; channel: string }>
  draftPost: string
  status: 'complete' | 'failed'
}): Promise<DomainResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_generations')
    .update({
      positioning: params.positioning,
      post_ideas: params.postIdeas,
      draft_post: params.draftPost,
      status: params.status,
    })
    .eq('workspace_id', params.workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function getOnboardingGeneration(params: {
  workspaceId: string
}): Promise<DomainResult<OnboardingGeneration | null>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_generations')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: true, data: null }

  return {
    ok: true,
    data: {
      id: data.id,
      workspaceId: data.workspace_id,
      positioning: data.positioning,
      postIdeas: (data.post_ideas as Array<{ hook: string; channel: string }>) ?? [],
      draftPost: data.draft_post,
      status: data.status as OnboardingGeneration['status'],
      createdAt: data.created_at,
    },
  }
}

export async function getProfileForGeneration(params: {
  workspaceId: string
}): Promise<DomainResult<{
  displayName: string | null
  purpose: string | null
  role: string | null
  industry: string | null
  expertise: string | null
  profileInsights: Record<string, string> | null
  channels: string[]
  audienceTargets: string[]
  audiencePerception: string[]
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, purpose, role, industry, expertise, profile_insights, channels, audience_targets, audience_perception')
    .eq('workspace_id', params.workspaceId)
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Profile not found' }

  return {
    ok: true,
    data: {
      displayName: data.display_name,
      purpose: data.purpose,
      role: data.role,
      industry: data.industry,
      expertise: data.expertise,
      profileInsights: data.profile_insights as Record<string, string> | null,
      channels: data.channels ?? [],
      audienceTargets: data.audience_targets ?? [],
      audiencePerception: data.audience_perception ?? [],
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/domain/onboarding.ts
git commit -m "feat(domain): add onboarding domain functions"
```

---

## Task 4: API Route — /api/onboarding (extend with new steps)

**Files:**
- Modify: `app/api/onboarding/route.ts`

- [ ] **Step 1: Replace route.ts with extended version**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createWorkspaceForUser, updateProfile } from '@/lib/domain/workspace'
import { updateOnboardingStep } from '@/lib/domain/onboarding'

// POST /api/onboarding
// Body: { step: string, data: Record<string, unknown> }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { step, data } = body

  // ── Original steps (kept for backwards compatibility) ──────────────────────
  if (step === 'workspace') {
    if (!data?.name?.trim()) {
      return NextResponse.json({ error: 'Workspace name required' }, { status: 400 })
    }
    const result = await createWorkspaceForUser({
      userId: session.userId,
      name: data.name.trim(),
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json(result.data, { status: 201 })
  }

  if (step === 'profile') {
    const result = await updateProfile({
      workspaceId: session.workspaceId,
      displayName: data?.display_name ?? undefined,
      bio: data?.bio ?? undefined,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'privacy') {
    const result = await updateProfile({
      workspaceId: session.workspaceId,
      privateFeedOperatorVisible: data?.operator_visible ?? false,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ── New onboarding steps ───────────────────────────────────────────────────
  if (
    step === 'identity' ||
    step === 'purpose' ||
    step === 'beliefs' ||
    step === 'channels' ||
    step === 'audience'
  ) {
    const result = await updateOnboardingStep({
      workspaceId: session.workspaceId,
      step,
      data,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/onboarding/route.ts
git commit -m "feat(api): add new onboarding step handlers to /api/onboarding"
```

---

## Task 5: API Route — /api/onboarding/generate

**Files:**
- Create: `app/api/onboarding/generate/route.ts`

- [ ] **Step 1: Create the generate route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import {
  createOnboardingGeneration,
  updateOnboardingGeneration,
  getProfileForGeneration,
} from '@/lib/domain/onboarding'
import { callClaude } from '@/lib/ai/generate'

// POST /api/onboarding/generate
// Reads the completed profile and generates: positioning statement, 3 post ideas, 1 draft post.
// Stores result in onboarding_generations. Called once after step 6 completes.
export async function POST(_req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create a pending generation row (upsert — safe to call twice)
  const initResult = await createOnboardingGeneration({ workspaceId: session.workspaceId })
  if (!initResult.ok) {
    return NextResponse.json({ error: initResult.error }, { status: 500 })
  }

  // Fetch profile data
  const profileResult = await getProfileForGeneration({ workspaceId: session.workspaceId })
  if (!profileResult.ok) {
    return NextResponse.json({ error: profileResult.error }, { status: 500 })
  }
  const p = profileResult.data

  // Build the prompt
  const name = p.displayName ?? 'the user'
  const role = p.role ?? 'professional'
  const industry = p.industry ?? 'their field'
  const expertise = p.expertise ?? ''
  const purpose = p.purpose ?? 'personal brand'
  const channels = p.channels.length > 0 ? p.channels.join(', ') : 'LinkedIn'
  const audience = p.audienceTargets.length > 0 ? p.audienceTargets.join(', ') : 'professionals'
  const perception = p.audiencePerception.length > 0 ? p.audiencePerception.join(', ') : 'expert'
  const primaryChannel = p.channels[0] ?? 'LinkedIn'

  const beliefs = p.profileInsights
    ? [
        p.profileInsights.core_belief,
        p.profileInsights.energized_by,
        p.profileInsights.misconceptions,
        p.profileInsights.lessons,
      ]
        .filter(Boolean)
        .join(' | ')
    : ''

  const systemPrompt = `You are a world-class thought leadership strategist. You write with precision and economy. You do not use filler phrases or corporate language. Every sentence earns its place.`

  const userMessage = `Create onboarding content for a new Clout user.

PROFILE:
- Name: ${name}
- Role: ${role}
- Industry: ${industry}
- Expertise: ${expertise}
- Building: ${purpose}
- Publishes on: ${channels}
- Audience: ${audience}
- Should be seen as: ${perception}
- Beliefs/philosophy: ${beliefs || 'not provided'}

OUTPUT FORMAT (respond with valid JSON only, no markdown, no explanation):
{
  "positioning": "1-2 sentence positioning statement that captures who they are, who they serve, and what makes them distinct. Should feel like a sharp professional summary, not a bio.",
  "post_ideas": [
    { "hook": "First post hook or title — direct and specific to their expertise and audience", "channel": "${primaryChannel}" },
    { "hook": "Second post hook — addresses a misconception or bold perspective", "channel": "${primaryChannel}" },
    { "hook": "Third post hook — practical insight or lesson they often share", "channel": "${primaryChannel}" }
  ],
  "draft_post": "A complete, publish-ready post for ${primaryChannel}. 150-250 words. Uses their voice. No hashtags unless LinkedIn. No emojis. Strong opening line, concrete insight, clear close."
}`

  try {
    const result = await callClaude({
      systemPrompt,
      userMessage,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 1024,
    })

    let parsed: {
      positioning: string
      post_ideas: Array<{ hook: string; channel: string }>
      draft_post: string
    }

    try {
      parsed = JSON.parse(result.content)
    } catch {
      // If JSON parse fails, store failure and return error
      await updateOnboardingGeneration({
        workspaceId: session.workspaceId,
        positioning: '',
        postIdeas: [],
        draftPost: '',
        status: 'failed',
      })
      return NextResponse.json({ error: 'Generation parse failed' }, { status: 500 })
    }

    await updateOnboardingGeneration({
      workspaceId: session.workspaceId,
      positioning: parsed.positioning ?? '',
      postIdeas: parsed.post_ideas ?? [],
      draftPost: parsed.draft_post ?? '',
      status: 'complete',
    })

    return NextResponse.json({
      positioning: parsed.positioning,
      postIdeas: parsed.post_ideas,
      draftPost: parsed.draft_post,
    })
  } catch {
    await updateOnboardingGeneration({
      workspaceId: session.workspaceId,
      positioning: '',
      postIdeas: [],
      draftPost: '',
      status: 'failed',
    })
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/onboarding/generate/route.ts
git commit -m "feat(api): add /api/onboarding/generate endpoint"
```

---

## Task 6: Onboarding Page — 6-step wizard + split layout + interstitial

**Files:**
- Replace: `app/(auth)/onboarding/page.tsx`

This is the largest task. The component manages step state (1–6), form data for each step, the live summary panel, and a post-submit interstitial state (`generating` | `results`).

**CLAUDE.md constraints to respect:**
- Zinc palette only — `bg-zinc-900` for dark panel, no custom colors, no gradients
- No animations beyond `transition-colors` on interactive elements
- Geist font from root layout — do not override

- [ ] **Step 1: Replace app/(auth)/onboarding/page.tsx**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6
type PageState = 'form' | 'generating' | 'results'

interface FormData {
  workspaceName: string
  displayName: string
  role: string
  industry: string
  expertise: string
  purpose: string
  coreBelief: string
  energizedBy: string
  misconceptions: string
  lessons: string
  channels: string[]
  audienceTargets: string[]
  audiencePerception: string[]
}

interface GenerationResult {
  positioning: string
  postIdeas: Array<{ hook: string; channel: string }>
  draftPost: string
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Workspace',
  2: 'Identity',
  3: 'Purpose',
  4: 'Beliefs',
  5: 'Channels',
  6: 'Audience',
}

const PURPOSE_OPTIONS = [
  'Personal brand',
  'Company',
  'Career growth',
  'Thought leadership',
  'Something new',
]

const CHANNEL_OPTIONS = [
  'LinkedIn',
  'X / Twitter',
  'Newsletter',
  'Blog',
  'Instagram',
  'YouTube',
  'Internal comms',
  'Substack',
]

const AUDIENCE_WHO_OPTIONS = [
  'Executives',
  'Founders',
  'Recruiters',
  'Customers',
  'Creatives',
  'Investors',
  'Industry peers',
]

const AUDIENCE_PERCEPTION_OPTIONS = [
  'Expert',
  'Trusted',
  'Bold thinker',
  'Helpful',
  'Operator',
  'Creator',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [pageState, setPageState] = useState<PageState>('form')
  const [beliefsExpanded, setBeliefsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [generatingLabel, setGeneratingLabel] = useState('Building your strategy\u2026')

  const [form, setForm] = useState<FormData>({
    workspaceName: '',
    displayName: '',
    role: '',
    industry: '',
    expertise: '',
    purpose: '',
    coreBelief: '',
    energizedBy: '',
    misconceptions: '',
    lessons: '',
    channels: [],
    audienceTargets: [],
    audiencePerception: [],
  })

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  const toggleArray = useCallback((key: 'channels' | 'audienceTargets' | 'audiencePerception', value: string) => {
    setForm((f) => {
      const arr = f[key] as string[]
      return {
        ...f,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }, [])

  // ─── Validation ─────────────────────────────────────────────────────────────

  const canAdvance =
    step === 1 ? form.workspaceName.trim().length > 0 :
    step === 2 ? form.displayName.trim().length > 0 :
    step === 3 ? form.purpose.length > 0 :
    true // steps 4-6 can advance without required fields

  // ─── Step submission ─────────────────────────────────────────────────────────

  async function postStep(stepName: string, data: Record<string, unknown>) {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: stepName, data }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      console.warn(`Onboarding step ${stepName}:`, d.error)
    }
  }

  async function next() {
    setLoading(true)
    setError(null)

    try {
      if (step === 1) {
        await postStep('workspace', { name: form.workspaceName })
        setStep(2)
      } else if (step === 2) {
        await postStep('identity', {
          display_name: form.displayName,
          role: form.role,
          industry: form.industry,
          expertise: form.expertise,
        })
        setStep(3)
      } else if (step === 3) {
        await postStep('purpose', { purpose: form.purpose })
        setStep(4)
      } else if (step === 4) {
        await postStep('beliefs', {
          profile_insights: {
            core_belief: form.coreBelief,
            energized_by: form.energizedBy,
            misconceptions: form.misconceptions,
            lessons: form.lessons,
          },
        })
        setStep(5)
      } else if (step === 5) {
        await postStep('channels', { channels: form.channels })
        setStep(6)
      } else if (step === 6) {
        await postStep('audience', {
          audience_targets: form.audienceTargets,
          audience_perception: form.audiencePerception,
        })
        await runGeneration()
      }
    } catch {
      setError('Something went wrong. You can skip this step.')
    } finally {
      setLoading(false)
    }
  }

  async function skip() {
    // Save current partial data then go to generating/dashboard
    setLoading(true)
    try {
      if (step === 2) await postStep('identity', { display_name: form.displayName, role: form.role, industry: form.industry, expertise: form.expertise })
      if (step === 3) await postStep('purpose', { purpose: form.purpose })
      if (step === 4) await postStep('beliefs', { profile_insights: { core_belief: form.coreBelief, energized_by: form.energizedBy, misconceptions: form.misconceptions, lessons: form.lessons } })
      if (step === 5) await postStep('channels', { channels: form.channels })
      if (step === 6) await postStep('audience', { audience_targets: form.audienceTargets, audience_perception: form.audiencePerception })
    } catch { /* non-fatal */ }
    setLoading(false)
    router.push('/dashboard')
  }

  async function runGeneration() {
    setPageState('generating')

    // Cycle loading labels
    const labels = [
      'Building your strategy\u2026',
      'Writing your first posts\u2026',
      'Preparing your positioning\u2026',
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % labels.length
      setGeneratingLabel(labels[i])
    }, 2000)

    // 10s timeout fallback
    const timeout = setTimeout(() => {
      clearInterval(interval)
      router.push('/dashboard')
    }, 10000)

    try {
      const res = await fetch('/api/onboarding/generate', { method: 'POST' })
      clearInterval(interval)
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        setGenerationResult(data)
        setEditedDraft(data.draftPost ?? '')
        setPageState('results')
      } else {
        router.push('/dashboard')
      }
    } catch {
      clearInterval(interval)
      clearTimeout(timeout)
      router.push('/dashboard')
    }
  }

  // ─── Summary panel helpers ───────────────────────────────────────────────────

  const summaryBrief = (() => {
    const parts: string[] = []
    if (form.purpose) parts.push(`Building ${form.purpose.toLowerCase()}`)
    if (form.role) parts.push(`as ${form.role}`)
    if (form.channels.length > 0) parts.push(`publishing on ${form.channels.slice(0, 2).join(' & ')}`)
    if (form.audienceTargets.length > 0) parts.push(`reaching ${form.audienceTargets.slice(0, 2).join(', ')}`)
    if (form.audiencePerception.length > 0) parts.push(`known as ${form.audiencePerception[0]}`)
    if (parts.length === 0) return 'Complete each step to see your tailored strategy.'
    return parts.join(' · ') + '.'
  })()

  const summaryTags = [
    form.purpose && { label: form.purpose, filled: true },
    form.role && { label: form.role, filled: true },
    form.channels[0] && { label: form.channels[0], filled: true },
    form.audienceTargets[0] && { label: form.audienceTargets[0], filled: true },
    !form.purpose && { label: 'Purpose ···', filled: false },
    !form.channels[0] && { label: 'Channels ···', filled: false },
    !form.audienceTargets[0] && { label: 'Audience ···', filled: false },
  ].filter(Boolean) as Array<{ label: string; filled: boolean }>

  // ─── Render: Generating ──────────────────────────────────────────────────────

  if (pageState === 'generating') {
    return (
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-900 rounded-full w-full" />
        </div>
        <div>
          <p className="text-base font-medium text-zinc-900">{generatingLabel}</p>
          <p className="mt-1 text-sm text-zinc-400">This takes about 10 seconds.</p>
        </div>
      </div>
    )
  }

  // ─── Render: Results ─────────────────────────────────────────────────────────

  if (pageState === 'results' && generationResult) {
    return (
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {form.displayName ? `Here's your start, ${form.displayName.split(' ')[0]}.` : "Here's your start."}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Clout built this from your profile. Edit anything before you go.</p>
        </div>

        {/* Positioning */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Your positioning</p>
          <p className="text-sm text-zinc-900 leading-relaxed">{generationResult.positioning}</p>
        </div>

        {/* Post ideas */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Post ideas to get you started</p>
          <div className="space-y-3">
            {generationResult.postIdeas.map((idea, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm text-zinc-900">{idea.hook}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{idea.channel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Draft post */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Your first draft — ready to edit</p>
          <textarea
            className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            rows={10}
            value={editedDraft}
            onChange={(e) => setEditedDraft(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Skip, take me to the dashboard
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Enter dashboard →
          </button>
        </div>
      </div>
    )
  }

  // ─── Render: Form (6 steps) ──────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-3xl gap-0 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

      {/* LEFT: Form panel */}
      <div className="flex flex-1 flex-col p-8 min-w-0">

        {/* Logo + time expectation */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Clout</p>
          <p className="text-xs text-zinc-400">Takes about 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="mb-7 space-y-1.5">
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
              <div
                key={s}
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-colors',
                  s <= step ? 'bg-zinc-900' : 'bg-zinc-200'
                )}
              />
            ))}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-900">
              {STEP_LABELS[step]}
            </span>
            <span className="text-xs text-zinc-300">{step} / 6</span>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 space-y-5">

          {/* ── Step 1: Workspace ── */}
          {step === 1 && (
            <>
              <StepHeader
                title="Create your workspace"
                subtitle="Your workspace stores your ideas, lenses, drafts, publishing settings, and audience strategy. Use your name for a personal brand, or a company name for a team account."
                why={null}
                reassurance="You can rename it anytime in Settings → Profile."
              />
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Workspace name
                </label>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder="Clout or James Dean"
                  value={form.workspaceName}
                  onChange={(e) => set('workspaceName', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance && !loading && next()}
                />
              </div>
            </>
          )}

          {/* ── Step 2: Identity ── */}
          {step === 2 && (
            <>
              <StepHeader
                title="Who are you?"
                subtitle="This is the foundation of every piece of content Clout helps you create."
                why="We use this to build sharper positioning."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Name</label>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder="James Dean"
                  value={form.displayName}
                  onChange={(e) => set('displayName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Profession / Role</label>
                  <input
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g. Retail Strategist"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Industry</label>
                  <input
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    placeholder="e.g. Retail, SaaS"
                    value={form.industry}
                    onChange={(e) => set('industry', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">One-line expertise</label>
                <input
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder="e.g. Helping brands understand shopper behavior"
                  value={form.expertise}
                  onChange={(e) => set('expertise', e.target.value)}
                />
                <p className="mt-1 text-xs text-zinc-400">This becomes the core of your positioning.</p>
              </div>
            </>
          )}

          {/* ── Step 3: Purpose ── */}
          {step === 3 && (
            <>
              <StepHeader
                title="What are you building influence for?"
                subtitle="Choose the direction that best captures your intent."
                why="We use this to shape your content strategy."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div className="space-y-2">
                {PURPOSE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt}
                    label={opt}
                    selected={form.purpose === opt}
                    onClick={() => set('purpose', opt)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Step 4: Beliefs ── */}
          {step === 4 && (
            <>
              <StepHeader
                title="What do you believe?"
                subtitle="Your philosophy creates content nobody else can write."
                why="We use this to create content nobody else could write."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  What's one belief or perspective you hold strongly?
                </label>
                <textarea
                  autoFocus
                  className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  rows={3}
                  placeholder="e.g. Most brands underestimate the value of physical retail..."
                  value={form.coreBelief}
                  onChange={(e) => set('coreBelief', e.target.value)}
                />
              </div>

              {!beliefsExpanded ? (
                <button
                  onClick={() => setBeliefsExpanded(true)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  + Add more context (optional)
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Topics that energize you</label>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      rows={2}
                      placeholder="e.g. Consumer psychology, retail design, behavior change..."
                      value={form.energizedBy}
                      onChange={(e) => set('energizedBy', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Misconceptions you challenge</label>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      rows={2}
                      placeholder="e.g. That e-commerce has killed brick-and-mortar..."
                      value={form.misconceptions}
                      onChange={(e) => set('misconceptions', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Lessons you repeat often</label>
                    <textarea
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      rows={2}
                      placeholder="e.g. Invest in fundamentals over chasing trends..."
                      value={form.lessons}
                      onChange={(e) => set('lessons', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 5: Channels ── */}
          {step === 5 && (
            <>
              <StepHeader
                title="Where do you publish?"
                subtitle="Select all that apply."
                why="We tailor formats and cadence by platform."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((ch) => (
                  <ChipButton
                    key={ch}
                    label={ch}
                    selected={form.channels.includes(ch)}
                    onClick={() => toggleArray('channels', ch)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Step 6: Audience ── */}
          {step === 6 && (
            <>
              <StepHeader
                title="Who is your audience?"
                subtitle="Knowing who you're speaking to makes everything sharper."
                why="This helps make your content resonate."
                reassurance="You can add to or edit this anytime in Settings → Profile."
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Who do you want to reach?</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_WHO_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt}
                      label={opt}
                      selected={form.audienceTargets.includes(opt)}
                      onClick={() => toggleArray('audienceTargets', opt)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">What should they think of you?</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_PERCEPTION_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt}
                      label={opt}
                      selected={form.audiencePerception.includes(opt)}
                      onClick={() => toggleArray('audiencePerception', opt)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Error */}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={loading}
                className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                ← Back
              </button>
            )}
            {step > 1 && (
              <button
                onClick={skip}
                disabled={loading}
                className="text-sm text-zinc-300 hover:text-zinc-500 transition-colors"
              >
                Skip for now →
              </button>
            )}
          </div>
          <button
            onClick={next}
            disabled={!canAdvance || loading}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-colors',
              !canAdvance || loading
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            )}
          >
            {loading ? 'Saving\u2026' : step === 6 ? 'Build my strategy →' : 'Continue →'}
          </button>
        </div>
      </div>

      {/* RIGHT: Summary panel (hidden on mobile) */}
      <div className="hidden md:flex w-64 shrink-0 flex-col bg-zinc-900 p-7 gap-0">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">Your Clout profile</p>

        {/* Profile card */}
        <div className="rounded-lg bg-zinc-800 p-4 mb-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-100">
            {form.displayName ? form.displayName.charAt(0).toUpperCase() : form.workspaceName.charAt(0).toUpperCase() || 'C'}
          </div>
          <p className="text-sm font-semibold text-white leading-tight">
            {form.workspaceName || 'Your workspace'}
          </p>
          {form.role && (
            <p className="mt-0.5 text-xs text-zinc-500">{form.role}{form.industry ? ` · ${form.industry}` : ''}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summaryTags.slice(0, 5).map((t) => (
              <span
                key={t.label}
                className={cn(
                  'rounded px-1.5 py-0.5 text-xs font-medium',
                  t.filled
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'border border-dashed border-zinc-700 text-zinc-600'
                )}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4 h-px bg-zinc-800" />

        {/* Strategy brief */}
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">Strategy brief</p>
        <p className="text-xs text-zinc-500 leading-relaxed italic">{summaryBrief}</p>

        <div className="mt-auto pt-4 text-center text-xs text-zinc-700">Builds as you answer ↑</div>
      </div>
    </div>
  )
}

// ─── Small reusable components ────────────────────────────────────────────────

function StepHeader({
  title,
  subtitle,
  why,
  reassurance,
}: {
  title: string
  subtitle: string
  why: string | null
  reassurance: string
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500">{subtitle}</p>
      {why && <p className="text-xs text-zinc-400">{why}</p>}
      <p className="text-xs text-zinc-400">{reassurance}</p>
    </div>
  )
}

function RadioCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        selected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
      )}
    >
      <div
        className={cn(
          'h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors',
          selected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
        )}
      />
      <span className={cn('text-sm font-medium', selected ? 'text-zinc-900' : 'text-zinc-600')}>
        {label}
      </span>
    </button>
  )
}

function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
      )}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Verify dev server shows the new onboarding**

```bash
# Verify TypeScript compiles
npx tsc --noEmit
```

Expected: no errors. If errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/onboarding/page.tsx
git commit -m "feat(onboarding): 6-step wizard with split layout, live summary, and post-submit interstitial"
```

---

## Task 7: Dashboard — Welcome Banner for First Visit

**Files:**
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Add first-visit detection to dashboard**

The dashboard page already fetches profile data at line 50. Extend the profile fetch to check `onboarding_completed_at` and `display_name`. Add state for the welcome banner:

After the existing state declarations (around line 22), add:

```tsx
const [showWelcome, setShowWelcome] = useState(false)
const [welcomeName, setWelcomeName] = useState('')
const [onboardingDraft, setOnboardingDraft] = useState<string | null>(null)
```

- [ ] **Step 2: Extend the profile fetch block**

Replace the existing profile fetch block (lines 50–56) with:

```tsx
const profileRes = await fetch('/api/profile')
if (profileRes.ok) {
  const profile = await profileRes.json()
  const hasBasics = profile.display_name && profile.tone_notes
  const hasContext = (profile.mental_models?.length ?? 0) > 0
  setProfileIncomplete(!hasBasics || !hasContext)

  // Show welcome banner if onboarding just completed (within last 5 minutes)
  if (profile.onboarding_completed_at) {
    const completedAt = new Date(profile.onboarding_completed_at).getTime()
    const isFirstVisit = Date.now() - completedAt < 5 * 60 * 1000
    if (isFirstVisit) {
      setShowWelcome(true)
      setWelcomeName(profile.display_name ?? '')
    }
  }
}

// Fetch onboarding generation if it exists
const genRes = await fetch('/api/onboarding/generation')
if (genRes.ok) {
  const gen = await genRes.json()
  if (gen?.draft_post) setOnboardingDraft(gen.draft_post)
}
```

- [ ] **Step 3: Add the welcome banner JSX**

In the return JSX, add this block immediately after `<div className="space-y-8">` and before the `<div className="flex items-center justify-between">` heading block:

```tsx
{showWelcome && (
  <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          {welcomeName ? `Welcome, ${welcomeName.split(' ')[0]}. Here's where we start.` : 'Welcome. Here's where we start.'}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Clout has built your initial strategy. Your workspace is ready.
        </p>
      </div>
      <button
        onClick={() => setShowWelcome(false)}
        className="text-zinc-300 hover:text-zinc-500 transition-colors text-sm"
      >
        ✕
      </button>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <a
        href="/capture/new"
        className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors text-center"
      >
        Capture your first idea
      </a>
      <a
        href="/settings/profile"
        className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors text-center"
      >
        Complete your profile
      </a>
      <a
        href="/capture/new"
        className="rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 transition-colors text-center"
      >
        Start writing →
      </a>
    </div>

    {onboardingDraft && (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Your first draft — from onboarding</p>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
          {onboardingDraft}
        </div>
        <a href="/studio" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
          Open in Studio →
        </a>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Create /api/onboarding/generation GET route**

Create `app/api/onboarding/generation/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOnboardingGeneration } from '@/lib/domain/onboarding'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getOnboardingGeneration({ workspaceId: session.workspaceId })
  if (!result.ok) return NextResponse.json(null)
  if (!result.data || result.data.status !== 'complete') return NextResponse.json(null)

  return NextResponse.json({
    positioning: result.data.positioning,
    post_ideas: result.data.postIdeas,
    draft_post: result.data.draftPost,
  })
}
```

- [ ] **Step 5: Also expose onboarding_completed_at in /api/profile**

Check `app/api/profile/route.ts` — if it selects profile columns, add `onboarding_completed_at` to the select. Find the select query and add the field:

```typescript
// In the GET handler of app/api/profile/route.ts,
// find the .select() call and add onboarding_completed_at:
.select('display_name, bio, tone_notes, mental_models, philosophies, industries, target_audiences, sample_content, onboarding_completed_at')
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any errors before committing.

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/page.tsx app/api/onboarding/generation/route.ts app/api/profile/route.ts
git commit -m "feat(dashboard): welcome banner on first post-onboarding visit"
```

---

## Verification Checklist

Run through these manually in the browser after implementation:

- [ ] Complete all 6 steps → interstitial shows "Building your strategy…" → results screen with positioning, post ideas, draft → "Enter dashboard" routes to `/dashboard`
- [ ] Skip on step 3 → saves partial data → routes directly to `/dashboard`
- [ ] Skip on step 4 with no text entered → no error
- [ ] Back button on step 3 → returns to step 2 with Name still populated
- [ ] Back button on step 2 → returns to step 1 with Workspace name still populated
- [ ] Refresh on step 3 → page reloads to step 1 (client state resets — acceptable, autosave already POSTed what was submitted)
- [ ] Mobile viewport (375px) → right panel hidden, single column, all inputs accessible, chips wrap correctly
- [ ] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] After full completion, check Supabase `profiles` table → `purpose`, `role`, `channels`, `audience_targets`, `onboarding_completed_at` all populated
- [ ] `onboarding_generations` table → row with `status = 'complete'` and non-empty `positioning`, `draft_post`
- [ ] Dashboard: welcome banner appears on first visit after onboarding, dismisses on ✕ click
- [ ] Generation failure (disconnect network on step 6 submit) → redirects to dashboard within 10s with no crash
