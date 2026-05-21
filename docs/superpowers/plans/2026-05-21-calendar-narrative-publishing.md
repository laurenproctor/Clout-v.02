# Calendar + Narrative Flow + Platform Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clout's inbox/queue/studio pages with a strategic narrative operations calendar — concept cards with goal-semantic colors, per-platform post strips, an arc-based Narrative view, and platform-native post previews.

**Architecture:** Two-phase delivery. Phase 1 (Tasks 1–13) ships the `/calendar` page with Grid + Narrative views and intelligence layer — fully functional without Phase 2. Phase 2 (Tasks 14–15) upgrades `/studio/[id]` to platform-native previews. Both phases share the same data model additions from Task 1.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-variable config), shadcn/ui, Supabase, TypeScript.

> ⚠️ **Next.js 16 note:** This project runs Next.js 16.2.4. Before touching routing or server/client component boundaries, read `node_modules/next/dist/docs/` for any API changes from Next.js 14/15 patterns. The App Router structure should be stable, but middleware and cache APIs may differ.

> ⚠️ **No test runner detected.** Use `npx tsc --noEmit` as the primary verification step after each task. Open the dev server and manually verify each component before committing.

---

## File Map

**New files:**
- `supabase/migrations/20260521_narrative_calendar_fields.sql`
- `styles/goal-colors.css`
- `types/calendar.ts`
- `lib/domain/calendar.ts`
- `app/api/calendar/route.ts`
- `app/api/narrative-health/route.ts`
- `app/api/narrative-arcs/route.ts`
- `app/api/outputs/[id]/narrative/route.ts`
- `components/platform-icons/PlatformIcon.tsx`
- `components/platform-icons/index.ts`
- `components/calendar/CalendarPage.tsx`
- `components/calendar/CalendarToolbar.tsx`
- `components/calendar/IntelligenceBar.tsx`
- `components/calendar/grid/GridView.tsx`
- `components/calendar/grid/DayHeader.tsx`
- `components/calendar/grid/ConceptCard.tsx`
- `components/calendar/grid/PlatformVariantStrip.tsx`
- `components/calendar/grid/PlatformPill.tsx`
- `components/calendar/detail/DetailPanel.tsx`
- `components/calendar/detail/PlatformPostRow.tsx`
- `components/calendar/narrative/NarrativeView.tsx`
- `components/calendar/narrative/NarrativeHealthPanel.tsx`
- `components/calendar/narrative/ArcBlock.tsx`
- `components/calendar/narrative/FunnelProgress.tsx`
- `app/(dashboard)/calendar/page.tsx`
- `components/studio/PlatformTabs.tsx`
- `components/studio/PlatformPreview.tsx`
- `components/studio/previews/LinkedInPreview.tsx`
- `components/studio/previews/XPreview.tsx`
- `components/studio/previews/ThreadsPreview.tsx`
- `components/studio/previews/NewsletterPreview.tsx`

**Modified files:**
- `styles/tokens.css` — add goal color variables
- `app/globals.css` — expose goal colors to Tailwind
- `types/domain.ts` — add NarrativeRole, NarrativeGoal, CalendarConcept, etc.
- `components/shell/sidebar.tsx` — add Calendar nav item, remove Inbox/Queue
- `app/(dashboard)/inbox/page.tsx` — redirect to /calendar
- `app/(dashboard)/queue/page.tsx` — redirect to /calendar
- `app/(dashboard)/studio/[id]/page.tsx` — platform-native editor (Phase 2)
- `docs/CLAUDE.md` — update design rules to allow goal colors

---

## Phase 1: Foundation

---

### Task 1: Goal Color Tokens + Design System Update

**Files:**
- Modify: `styles/tokens.css`
- Modify: `app/globals.css`
- Modify: `docs/CLAUDE.md`

- [ ] **Step 1: Add goal color CSS variables to `styles/tokens.css`**

Append after the existing `:root` brand colors block:

```css
/* --------------------------------------------------------------------------
   NARRATIVE GOAL COLORS — semantic, load-bearing for calendar UI
   -------------------------------------------------------------------------- */

:root {
  /* Authority */
  --goal-authority-bg: #eff6ff;
  --goal-authority-border: #bfdbfe;
  --goal-authority-accent: #3b82f6;
  --goal-authority-text: #1d4ed8;

  /* Conversation */
  --goal-conversation-bg: #fffbeb;
  --goal-conversation-border: #fde68a;
  --goal-conversation-accent: #f59e0b;
  --goal-conversation-text: #b45309;

  /* Leads */
  --goal-leads-bg: #f0fdf4;
  --goal-leads-border: #bbf7d0;
  --goal-leads-accent: #22c55e;
  --goal-leads-text: #15803d;

  /* Loyalty */
  --goal-loyalty-bg: #f5f3ff;
  --goal-loyalty-border: #ddd6fe;
  --goal-loyalty-accent: #a78bfa;
  --goal-loyalty-text: #6d28d9;

  /* Education */
  --goal-education-bg: #ecfeff;
  --goal-education-border: #a5f3fc;
  --goal-education-accent: #22d3ee;
  --goal-education-text: #0e7490;

  /* Subscribers */
  --goal-subscribers-bg: #fff1f2;
  --goal-subscribers-border: #fecdd3;
  --goal-subscribers-accent: #fb7185;
  --goal-subscribers-text: #9f1239;

  /* Positioning */
  --goal-positioning-bg: #eef2ff;
  --goal-positioning-border: #c7d2fe;
  --goal-positioning-accent: #818cf8;
  --goal-positioning-text: #3730a3;

  /* Retention */
  --goal-retention-bg: #fdf4ff;
  --goal-retention-border: #e9d5ff;
  --goal-retention-accent: #c084fc;
  --goal-retention-text: #7e22ce;
}
```

- [ ] **Step 2: Expose goal colors to Tailwind in `app/globals.css`**

Inside the existing `@theme inline { }` block, append after the last `--color-brand-*` line:

```css
  /* Goal colors */
  --color-goal-authority-bg: var(--goal-authority-bg);
  --color-goal-authority-border: var(--goal-authority-border);
  --color-goal-authority-accent: var(--goal-authority-accent);
  --color-goal-authority-text: var(--goal-authority-text);
  --color-goal-conversation-bg: var(--goal-conversation-bg);
  --color-goal-conversation-border: var(--goal-conversation-border);
  --color-goal-conversation-accent: var(--goal-conversation-accent);
  --color-goal-conversation-text: var(--goal-conversation-text);
  --color-goal-leads-bg: var(--goal-leads-bg);
  --color-goal-leads-border: var(--goal-leads-border);
  --color-goal-leads-accent: var(--goal-leads-accent);
  --color-goal-leads-text: var(--goal-leads-text);
  --color-goal-loyalty-bg: var(--goal-loyalty-bg);
  --color-goal-loyalty-border: var(--goal-loyalty-border);
  --color-goal-loyalty-accent: var(--goal-loyalty-accent);
  --color-goal-loyalty-text: var(--goal-loyalty-text);
  --color-goal-education-bg: var(--goal-education-bg);
  --color-goal-education-border: var(--goal-education-border);
  --color-goal-education-accent: var(--goal-education-accent);
  --color-goal-education-text: var(--goal-education-text);
  --color-goal-subscribers-bg: var(--goal-subscribers-bg);
  --color-goal-subscribers-border: var(--goal-subscribers-border);
  --color-goal-subscribers-accent: var(--goal-subscribers-accent);
  --color-goal-subscribers-text: var(--goal-subscribers-text);
  --color-goal-positioning-bg: var(--goal-positioning-bg);
  --color-goal-positioning-border: var(--goal-positioning-border);
  --color-goal-positioning-accent: var(--goal-positioning-accent);
  --color-goal-positioning-text: var(--goal-positioning-text);
  --color-goal-retention-bg: var(--goal-retention-bg);
  --color-goal-retention-border: var(--goal-retention-border);
  --color-goal-retention-accent: var(--goal-retention-accent);
  --color-goal-retention-text: var(--goal-retention-text);
```

- [ ] **Step 3: Update `docs/CLAUDE.md` Design Rules**

Replace:
```
- Zinc color palette only. No custom colors, no gradients.
```
With:
```
- Base chrome uses the zinc palette (backgrounds, borders, text, icons).
- Semantic goal colors (authority, conversation, leads, loyalty, education, subscribers, positioning, retention) are allowed — defined in `styles/tokens.css` and exposed via `@theme inline`. Use only via the CSS variable system, never hardcoded hex in components.
- No gradients.
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add styles/tokens.css app/globals.css docs/CLAUDE.md
git commit -m "feat: add narrative goal color tokens to design system"
```

---

### Task 2: Calendar Types

**Files:**
- Create: `types/calendar.ts`
- Modify: `types/domain.ts`

- [ ] **Step 1: Create `types/calendar.ts`**

```typescript
import type { OutputStatus, ChannelPlatform } from './domain'

export type NarrativeRole =
  | 'contrarian'
  | 'framework'
  | 'evidence'
  | 'cta'
  | 'tension'
  | 'founder'

export type NarrativeGoal =
  | 'authority'
  | 'conversation'
  | 'leads'
  | 'loyalty'
  | 'education'
  | 'subscribers'
  | 'positioning'
  | 'retention'

export type FunnelStage =
  | 'top'
  | 'awareness'
  | 'trust'
  | 'consideration'
  | 'conversion'
  | 'retention'

export type ResonancePrediction = 'high' | 'medium' | 'low'

export type IntelligenceLevel = 'danger' | 'warn' | 'good'

export interface CalendarPost {
  id: string
  platform: ChannelPlatform
  accountName: string
  handle: string | null
  status: OutputStatus
  scheduledAt: string | null
  channelId: string
}

export interface CalendarConcept {
  conceptId: string
  headline: string
  scheduledAt: string
  goal: NarrativeGoal | null
  narrativeRole: NarrativeRole | null
  narrativeArcId: string | null
  narrativeArcName: string | null
  funnelStage: FunnelStage | null
  resonancePrediction: ResonancePrediction | null
  lensNames: string[]
  posts: CalendarPost[]
}

export interface IntelligenceSignal {
  level: IntelligenceLevel
  label: string
  detail: string
}

export interface NarrativeHealth {
  score: number
  strengths: string[]
  gaps: string[]
}

export type ArcFunnelStep = {
  label: string
  state: 'done' | 'active' | 'pending'
}

export interface NarrativeArc {
  arcId: string
  arcName: string
  arcDescription: string
  goal: NarrativeGoal | null
  status: 'active' | 'paused' | 'completed'
  resonance: ResonancePrediction | null
  stage: string
  platforms: string[]
  totalConcepts: number
  totalPosts: number
  weeksRunning: number
  funnelSteps: ArcFunnelStep[]
  concepts: CalendarConcept[]
}
```

- [ ] **Step 2: Add narrative fields to `Output` in `types/domain.ts`**

Find the `Output` interface and add these fields after `performanceSnapshot`:

```typescript
  narrativeRole: NarrativeRole | null
  narrativeArcId: string | null
  narrativeArcName: string | null
  goal: NarrativeGoal | null
  funnelStage: FunnelStage | null
  resonancePrediction: ResonancePrediction | null
  conceptId: string | null
```

Add the import at the top of the file:
```typescript
import type { NarrativeRole, NarrativeGoal, FunnelStage, ResonancePrediction } from './calendar'
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/calendar.ts types/domain.ts
git commit -m "feat: add calendar and narrative types"
```

---

### Task 3: Database Migration

**Files:**
- Create: `supabase/migrations/20260521_narrative_calendar_fields.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Migration: Add narrative intelligence fields to outputs
-- These fields support the calendar concept model and narrative arc grouping.

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS concept_id       uuid,
  ADD COLUMN IF NOT EXISTS narrative_role   text
    CHECK (narrative_role IN ('contrarian','framework','evidence','cta','tension','founder')),
  ADD COLUMN IF NOT EXISTS narrative_arc_id   uuid,
  ADD COLUMN IF NOT EXISTS narrative_arc_name text,
  ADD COLUMN IF NOT EXISTS goal text
    CHECK (goal IN ('authority','conversation','leads','loyalty','education','subscribers','positioning','retention')),
  ADD COLUMN IF NOT EXISTS funnel_stage text
    CHECK (funnel_stage IN ('top','awareness','trust','consideration','conversion','retention')),
  ADD COLUMN IF NOT EXISTS resonance_prediction text
    CHECK (resonance_prediction IN ('high','medium','low'));

-- Backfill concept_id from generation_group_id for existing outputs
UPDATE outputs
SET concept_id = generation_group_id::uuid
WHERE concept_id IS NULL
  AND generation_group_id IS NOT NULL;

-- Index concept_id for the calendar grouping query
CREATE INDEX IF NOT EXISTS idx_outputs_concept_id
  ON outputs (concept_id)
  WHERE concept_id IS NOT NULL;

-- Index for narrative arc grouping
CREATE INDEX IF NOT EXISTS idx_outputs_narrative_arc_id
  ON outputs (narrative_arc_id)
  WHERE narrative_arc_id IS NOT NULL;

-- Index for goal-based filtering (intelligence bar)
CREATE INDEX IF NOT EXISTS idx_outputs_goal
  ON outputs (workspace_id, goal, created_at DESC)
  WHERE goal IS NOT NULL;

COMMENT ON COLUMN outputs.concept_id IS
  'Groups all platform-specific posts that represent the same content concept. Backfilled from generation_group_id.';
COMMENT ON COLUMN outputs.narrative_role IS
  'AI-assigned role in narrative sequence (contrarian, framework, evidence, etc.)';
COMMENT ON COLUMN outputs.goal IS
  'Strategic objective this post serves (authority, leads, loyalty, etc.)';
```

- [ ] **Step 2: Apply migration**

Apply via Supabase dashboard SQL editor, or:
```bash
npx supabase db push
```

If using the dashboard: paste the SQL into the SQL editor and run it.

- [ ] **Step 3: Regenerate Supabase types**

```bash
npx supabase gen types typescript --local > types/db.ts
```

If the local Supabase CLI isn't configured, manually add the new columns to `types/db.ts`. Find the `outputs` row type and add:

```typescript
concept_id: string | null
narrative_role: string | null
narrative_arc_id: string | null
narrative_arc_name: string | null
goal: string | null
funnel_stage: string | null
resonance_prediction: string | null
```

Add the same fields to the `outputs` Insert and Update types.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521_narrative_calendar_fields.sql types/db.ts
git commit -m "feat: add narrative intelligence columns to outputs table"
```

---

### Task 4: Domain — `lib/domain/calendar.ts`

**Files:**
- Create: `lib/domain/calendar.ts`

- [ ] **Step 1: Create `lib/domain/calendar.ts`**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import type {
  CalendarConcept,
  CalendarPost,
  NarrativeArc,
  NarrativeHealth,
  IntelligenceSignal,
  ArcFunnelStep,
  NarrativeGoal,
  NarrativeRole,
  FunnelStage,
  ResonancePrediction,
} from '@/types/calendar'
import type { OutputStatus, ChannelPlatform } from '@/types/domain'

// Returns the Monday of the week containing a given ISO date string.
export function getWeekStart(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// Returns the ISO date string 7 days after weekStart.
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString()
}

export async function getCalendarWeek(
  workspaceId: string,
  weekStart: string
): Promise<CalendarConcept[]> {
  const supabase = await createServerClient()

  const { data: outputs, error } = await supabase
    .from('outputs')
    .select(`
      id, concept_id, generation_group_id, title, content,
      status, scheduled_at, channel_id,
      goal, narrative_role, narrative_arc_id, narrative_arc_name,
      funnel_stage, resonance_prediction,
      channels (id, platform, label, account_id)
    `)
    .eq('workspace_id', workspaceId)
    .gte('scheduled_at', new Date(weekStart).toISOString())
    .lt('scheduled_at', getWeekEnd(weekStart))
    .neq('status', 'archived')
    .order('scheduled_at', { ascending: true })

  if (error) throw new Error(`getCalendarWeek: ${error.message}`)

  const groups = new Map<string, typeof outputs>()
  for (const output of outputs ?? []) {
    const key =
      output.concept_id ??
      output.generation_group_id ??
      output.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(output)
  }

  const concepts: CalendarConcept[] = []
  for (const [conceptId, posts] of groups) {
    const primary = posts[0]
    const headline =
      primary.title ??
      (primary.content as { body?: string } | null)?.body?.slice(0, 120) ??
      'Untitled'

    concepts.push({
      conceptId,
      headline,
      scheduledAt: primary.scheduled_at!,
      goal: (primary.goal as NarrativeGoal) ?? null,
      narrativeRole: (primary.narrative_role as NarrativeRole) ?? null,
      narrativeArcId: primary.narrative_arc_id ?? null,
      narrativeArcName: primary.narrative_arc_name ?? null,
      funnelStage: (primary.funnel_stage as FunnelStage) ?? null,
      resonancePrediction:
        (primary.resonance_prediction as ResonancePrediction) ?? null,
      lensNames: [],
      posts: posts.map((p) => ({
        id: p.id,
        platform: ((p.channels as { platform?: string } | null)?.platform ??
          'linkedin') as ChannelPlatform,
        accountName:
          (p.channels as { label?: string; account_id?: string } | null)
            ?.label ??
          (p.channels as { label?: string; account_id?: string } | null)
            ?.account_id ??
          'Unknown',
        handle: null,
        status: p.status as OutputStatus,
        scheduledAt: p.scheduled_at,
        channelId: p.channel_id ?? '',
      })),
    })
  }

  return concepts.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )
}

export async function getNarrativeHealth(
  workspaceId: string
): Promise<NarrativeHealth> {
  const supabase = await createServerClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('outputs')
    .select('goal, narrative_role, published_at, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .in('status', ['published', 'approved', 'queued'])

  const outputs = data ?? []
  const strengths: string[] = []
  const gaps: string[] = []
  let score = 100

  // Founder voice check
  const founderPosts = outputs.filter((o) => o.narrative_role === 'founder')
  if (founderPosts.length === 0) {
    score -= 20
    gaps.push('No founder narrative detected — audience losing personal connection')
  } else {
    strengths.push('Founder voice present in recent content')
  }

  // Goal diversity
  const goals = new Set(outputs.map((o) => o.goal).filter(Boolean))
  if (goals.size < 3) {
    score -= 15
    gaps.push(`Limited goal diversity — only ${goals.size} goal type(s) this month`)
  } else {
    strengths.push(`Good goal diversity — ${goals.size} distinct objectives this month`)
  }

  // Conversion content
  const conversionCount = outputs.filter(
    (o) => o.goal === 'leads' || o.goal === 'subscribers'
  ).length
  if (conversionCount === 0) {
    score -= 15
    gaps.push('Zero conversion-oriented content in last 30 days')
  } else {
    strengths.push(`${conversionCount} conversion post(s) this month`)
  }

  // Authority cadence
  const authorityCount = outputs.filter((o) => o.goal === 'authority').length
  if (authorityCount >= 3) {
    strengths.push(`Strong authority cadence — ${authorityCount} posts this month`)
  }

  return { score: Math.max(0, score), strengths, gaps }
}

export async function getIntelligenceSignals(
  workspaceId: string
): Promise<IntelligenceSignal[]> {
  const supabase = await createServerClient()
  const signals: IntelligenceSignal[] = []

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data } = await supabase
    .from('outputs')
    .select('goal, narrative_role, created_at, status')
    .eq('workspace_id', workspaceId)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .in('status', ['published', 'approved', 'queued'])
    .order('created_at', { ascending: false })

  const outputs = data ?? []

  // Founder voice
  const founderPosts = outputs.filter((o) => o.narrative_role === 'founder')
  if (founderPosts.length === 0) {
    const daysSince = 14
    signals.push({
      level: 'danger',
      label: 'No founder voice',
      detail: `detected in ${daysSince} days`,
    })
  }

  // Conversion drought
  const conversionPosts = outputs.filter(
    (o) => o.goal === 'leads' || o.goal === 'subscribers'
  )
  if (conversionPosts.length === 0) {
    signals.push({
      level: 'warn',
      label: 'Conversion content',
      detail: '— 0 posts in 14 days',
    })
  }

  // Authority cadence positive signal
  const authorityPosts = outputs.filter((o) => o.goal === 'authority')
  if (authorityPosts.length >= 3) {
    signals.push({
      level: 'good',
      label: 'Authority posts',
      detail: 'on strong cadence this period',
    })
  }

  // Narrative redundancy
  const goalCounts = outputs.reduce<Record<string, number>>((acc, o) => {
    if (o.goal) acc[o.goal] = (acc[o.goal] ?? 0) + 1
    return acc
  }, {})
  const dominant = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0]
  if (dominant && dominant[1] >= 5) {
    signals.push({
      level: 'warn',
      label: 'Narrative redundancy',
      detail: `— ${dominant[1]} ${dominant[0]} posts this period`,
    })
  }

  return signals
}

// Groups outputs by narrative arc for the Narrative view.
export async function getNarrativeArcs(
  workspaceId: string,
  weekStart: string
): Promise<NarrativeArc[]> {
  const concepts = await getCalendarWeek(workspaceId, weekStart)

  const arcMap = new Map<string, CalendarConcept[]>()
  const unassigned: CalendarConcept[] = []

  for (const concept of concepts) {
    if (concept.narrativeArcId) {
      if (!arcMap.has(concept.narrativeArcId))
        arcMap.set(concept.narrativeArcId, [])
      arcMap.get(concept.narrativeArcId)!.push(concept)
    } else {
      unassigned.push(concept)
    }
  }

  const arcs: NarrativeArc[] = []

  for (const [arcId, arcConcepts] of arcMap) {
    const first = arcConcepts[0]
    const allFunnelSteps: ArcFunnelStep[] = [
      'Problem',
      'Reframe',
      'Evidence',
      'Framework',
      'CTA',
    ].map((label) => {
      const roleMap: Record<string, NarrativeRole> = {
        Problem: 'tension',
        Reframe: 'contrarian',
        Evidence: 'evidence',
        Framework: 'framework',
        CTA: 'cta',
      }
      const role = roleMap[label]
      const hasConcept = arcConcepts.some((c) => c.narrativeRole === role)
      const activeRole = first.narrativeRole
      return {
        label,
        state: hasConcept ? 'done' : role === activeRole ? 'active' : 'pending',
      }
    })

    const totalPosts = arcConcepts.reduce((sum, c) => sum + c.posts.length, 0)
    const platforms = [
      ...new Set(
        arcConcepts.flatMap((c) => c.posts.map((p) => p.platform))
      ),
    ]

    arcs.push({
      arcId,
      arcName: first.narrativeArcName ?? 'Unnamed Arc',
      arcDescription: '',
      goal: first.goal,
      status: 'active',
      resonance: first.resonancePrediction,
      stage: 'Expansion',
      platforms,
      totalConcepts: arcConcepts.length,
      totalPosts,
      weeksRunning: 1,
      funnelSteps: allFunnelSteps,
      concepts: arcConcepts,
    })
  }

  return arcs
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type mismatches — most likely in the Supabase select join cast.

- [ ] **Step 3: Commit**

```bash
git add lib/domain/calendar.ts
git commit -m "feat: add calendar domain functions (week, health, intelligence, arcs)"
```

---

### Task 5: API Routes

**Files:**
- Create: `app/api/calendar/route.ts`
- Create: `app/api/narrative-health/route.ts`
- Create: `app/api/narrative-arcs/route.ts`
- Create: `app/api/outputs/[id]/narrative/route.ts`

- [ ] **Step 1: Create `app/api/calendar/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCalendarWeek, getWeekStart } from '@/lib/domain/calendar'
import { getWorkspaceForUser } from '@/lib/domain/workspace'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const week =
    new URL(req.url).searchParams.get('week') ??
    getWeekStart(new Date().toISOString().split('T')[0])

  const workspace = await getWorkspaceForUser(userId)
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const concepts = await getCalendarWeek(workspace.id, week)
  return NextResponse.json({ concepts, weekStart: week })
}
```

- [ ] **Step 2: Create `app/api/narrative-health/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getNarrativeHealth, getIntelligenceSignals } from '@/lib/domain/calendar'
import { getWorkspaceForUser } from '@/lib/domain/workspace'

export async function GET() {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspace = await getWorkspaceForUser(userId)
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const [health, signals] = await Promise.all([
    getNarrativeHealth(workspace.id),
    getIntelligenceSignals(workspace.id),
  ])

  return NextResponse.json({ health, signals })
}
```

- [ ] **Step 3: Create `app/api/narrative-arcs/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getNarrativeArcs, getWeekStart } from '@/lib/domain/calendar'
import { getWorkspaceForUser } from '@/lib/domain/workspace'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const week =
    new URL(req.url).searchParams.get('week') ??
    getWeekStart(new Date().toISOString().split('T')[0])

  const workspace = await getWorkspaceForUser(userId)
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const arcs = await getNarrativeArcs(workspace.id, week)
  return NextResponse.json({ arcs, weekStart: week })
}
```

- [ ] **Step 4: Create `app/api/outputs/[id]/narrative/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspaceForUser } from '@/lib/domain/workspace'
import type { NarrativeRole, NarrativeGoal } from '@/types/calendar'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    narrativeRole?: NarrativeRole
    goal?: NarrativeGoal
    narrativeArcId?: string
    narrativeArcName?: string
  }

  const workspace = await getWorkspaceForUser(userId)
  if (!workspace)
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('outputs')
    .update({
      narrative_role: body.narrativeRole ?? null,
      goal: body.goal ?? null,
      narrative_arc_id: body.narrativeArcId ?? null,
      narrative_arc_name: body.narrativeArcName ?? null,
    })
    .eq('id', params.id)
    .eq('workspace_id', workspace.id)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Check that `getWorkspaceForUser` exists in `lib/domain/workspace.ts`**

Run:
```bash
grep -r "getWorkspaceForUser" lib/domain/ --include="*.ts" -l
```

If it doesn't exist, check what the equivalent function is called in that file and update the imports in Tasks 4 and 5 to match. Common alternatives: `getWorkspace`, `getUserWorkspace`, `findWorkspaceByUser`.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/api/calendar/route.ts app/api/narrative-health/route.ts app/api/narrative-arcs/route.ts "app/api/outputs/[id]/narrative/route.ts"
git commit -m "feat: add /api/calendar, /api/narrative-health, /api/narrative-arcs routes"
```

---

## Phase 2: Core Components

---

### Task 6: PlatformIcon Component

**Files:**
- Create: `components/platform-icons/PlatformIcon.tsx`
- Create: `components/platform-icons/index.ts`

- [ ] **Step 1: Create `components/platform-icons/PlatformIcon.tsx`**

```typescript
import type { ChannelPlatform } from '@/types/domain'
import { cn } from '@/lib/utils'

interface PlatformIconProps {
  platform: ChannelPlatform
  size?: number
  className?: string
}

const PLATFORM_STYLES: Record<
  string,
  { bg: string; label: string; textClass: string }
> = {
  linkedin:              { bg: '#0077B5', label: 'in', textClass: 'font-black text-[9px]' },
  x:                     { bg: '#000000', label: 'X',  textClass: 'font-black text-[9px]' },
  twitter:               { bg: '#000000', label: 'X',  textClass: 'font-black text-[9px]' },
  threads:               { bg: '#000000', label: '',   textClass: '' },
  instagram:             { bg: 'gradient', label: '◻', textClass: 'font-black text-[9px]' },
  facebook:              { bg: '#1877F2', label: 'f',  textClass: 'font-black text-[10px]' },
  tiktok:                { bg: '#010101', label: 'TT', textClass: 'font-black text-[7px]' },
  newsletter:            { bg: '#FF6314', label: '✉',  textClass: 'text-[10px]' },
  wordpress:             { bg: '#21759B', label: 'W',  textClass: 'font-black text-[10px]' },
  shopify:               { bg: '#96BF48', label: 'S',  textClass: 'font-black text-[9px]' },
  google_business_profile: { bg: '#4285F4', label: 'G', textClass: 'font-black text-[9px]' },
}

const ThreadsIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 192 192"
    width={size * 0.6}
    height={size * 0.6}
    fill="white"
  >
    <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.141-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 25.425 74.204 18.11 97.013 17.942c22.976.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.194 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553zm-55.958 55.089c-10.421.586-21.264-4.086-27.041-11.819-3.525-4.734-5.714-10.959-5.495-17.546.371-11.285 8.914-19.876 23.684-20.717 3.641-.209 7.227-.307 10.76-.307 4.969 0 9.82.367 14.474 1.094-1.691 20.734-10.923 48.028-16.382 49.295z" />
  </svg>
)

const XIcon = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

export function PlatformIcon({
  platform,
  size = 16,
  className,
}: PlatformIconProps) {
  const config = PLATFORM_STYLES[platform] ?? {
    bg: '#71717a',
    label: '?',
    textClass: 'font-bold text-[9px]',
  }

  const borderRadius = Math.round(size * 0.25)

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      config.bg === 'gradient'
        ? 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)'
        : config.bg,
  }

  return (
    <span
      style={containerStyle}
      className={cn('text-white leading-none', className)}
    >
      {platform === 'threads' || platform === 'twitter' || platform === 'x' ? (
        platform === 'threads' ? (
          <ThreadsIcon size={size} />
        ) : (
          <XIcon size={size} />
        )
      ) : (
        <span className={config.textClass}>{config.label}</span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Create `components/platform-icons/index.ts`**

```typescript
export { PlatformIcon } from './PlatformIcon'
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/platform-icons/
git commit -m "feat: add PlatformIcon component with SVG logos for all platforms"
```

---

### Task 7: ConceptCard + PlatformVariantStrip + PlatformPill

**Files:**
- Create: `components/calendar/grid/PlatformPill.tsx`
- Create: `components/calendar/grid/PlatformVariantStrip.tsx`
- Create: `components/calendar/grid/ConceptCard.tsx`

- [ ] **Step 1: Create `components/calendar/grid/PlatformPill.tsx`**

```typescript
import { PlatformIcon } from '@/components/platform-icons'
import type { CalendarPost } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface PlatformPillProps {
  post: CalendarPost
}

const STATUS_STYLES: Record<
  string,
  { pill: string; label: string; text: string }
> = {
  approved:   { pill: 'border-green-200 bg-green-50',   label: 'Approved', text: 'text-green-700' },
  queued:     { pill: 'border-purple-200 bg-purple-50', label: 'Queued',   text: 'text-purple-700' },
  publishing: { pill: 'border-blue-200 bg-blue-50',     label: 'Publishing', text: 'text-blue-700' },
  published:  { pill: 'border-zinc-200 bg-zinc-50',     label: 'Published', text: 'text-zinc-500' },
  failed:     { pill: 'border-red-200 bg-red-50',       label: 'Failed',   text: 'text-red-700' },
  draft:      { pill: 'border-zinc-200 bg-white',       label: 'Draft',    text: 'text-zinc-400' },
  review:     { pill: 'border-amber-200 bg-amber-50',   label: 'Review',   text: 'text-amber-700' },
  archived:   { pill: 'border-zinc-100 bg-zinc-50',     label: 'Archived', text: 'text-zinc-300' },
}

export function PlatformPill({ post }: PlatformPillProps) {
  const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 flex-shrink-0 rounded-md border px-1.5 py-1',
        'cursor-pointer transition-shadow hover:shadow-sm',
        style.pill
      )}
    >
      <PlatformIcon platform={post.platform} size={14} />
      <div className="flex flex-col gap-0">
        <span className="text-[9px] font-semibold text-zinc-600 whitespace-nowrap max-w-[72px] truncate leading-tight">
          {post.accountName}
        </span>
        <span className={cn('text-[8px] font-bold uppercase tracking-wide leading-tight', style.text)}>
          {style.label}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/calendar/grid/PlatformVariantStrip.tsx`**

```typescript
import { PlatformPill } from './PlatformPill'
import type { CalendarPost } from '@/types/calendar'
import { useRouter } from 'next/navigation'

interface PlatformVariantStripProps {
  posts: CalendarPost[]
  maxVisible?: number
}

export function PlatformVariantStrip({
  posts,
  maxVisible = 4,
}: PlatformVariantStripProps) {
  const router = useRouter()
  const visible = posts.slice(0, maxVisible)
  const overflow = posts.length - maxVisible

  return (
    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
      {visible.map((post) => (
        <div
          key={post.id}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/studio/${post.id}`)
          }}
        >
          <PlatformPill post={post} />
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-md border border-dashed border-zinc-300 text-[9px] font-bold text-zinc-400 cursor-pointer hover:border-zinc-400">
          +{overflow}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/calendar/grid/ConceptCard.tsx`**

```typescript
'use client'

import { cn } from '@/lib/utils'
import type { CalendarConcept, NarrativeGoal, NarrativeRole } from '@/types/calendar'
import { PlatformVariantStrip } from './PlatformVariantStrip'

interface ConceptCardProps {
  concept: CalendarConcept
  isSelected: boolean
  onSelect: () => void
  showCausalArrow?: boolean
}

const GOAL_STYLES: Record<
  NarrativeGoal,
  { card: string; badge: string }
> = {
  authority:    { card: 'bg-[var(--goal-authority-bg)] border-[var(--goal-authority-border)] border-l-[var(--goal-authority-accent)]',    badge: 'bg-[color-mix(in_srgb,var(--goal-authority-bg)_80%,white)] text-[var(--goal-authority-text)]' },
  conversation: { card: 'bg-[var(--goal-conversation-bg)] border-[var(--goal-conversation-border)] border-l-[var(--goal-conversation-accent)]', badge: 'bg-[color-mix(in_srgb,var(--goal-conversation-bg)_80%,white)] text-[var(--goal-conversation-text)]' },
  leads:        { card: 'bg-[var(--goal-leads-bg)] border-[var(--goal-leads-border)] border-l-[var(--goal-leads-accent)]',               badge: 'bg-[color-mix(in_srgb,var(--goal-leads-bg)_80%,white)] text-[var(--goal-leads-text)]' },
  loyalty:      { card: 'bg-[var(--goal-loyalty-bg)] border-[var(--goal-loyalty-border)] border-l-[var(--goal-loyalty-accent)]',          badge: 'bg-[color-mix(in_srgb,var(--goal-loyalty-bg)_80%,white)] text-[var(--goal-loyalty-text)]' },
  education:    { card: 'bg-[var(--goal-education-bg)] border-[var(--goal-education-border)] border-l-[var(--goal-education-accent)]',    badge: 'bg-[color-mix(in_srgb,var(--goal-education-bg)_80%,white)] text-[var(--goal-education-text)]' },
  subscribers:  { card: 'bg-[var(--goal-subscribers-bg)] border-[var(--goal-subscribers-border)] border-l-[var(--goal-subscribers-accent)]', badge: 'bg-[color-mix(in_srgb,var(--goal-subscribers-bg)_80%,white)] text-[var(--goal-subscribers-text)]' },
  positioning:  { card: 'bg-[var(--goal-positioning-bg)] border-[var(--goal-positioning-border)] border-l-[var(--goal-positioning-accent)]', badge: 'bg-[color-mix(in_srgb,var(--goal-positioning-bg)_80%,white)] text-[var(--goal-positioning-text)]' },
  retention:    { card: 'bg-[var(--goal-retention-bg)] border-[var(--goal-retention-border)] border-l-[var(--goal-retention-accent)]',    badge: 'bg-[color-mix(in_srgb,var(--goal-retention-bg)_80%,white)] text-[var(--goal-retention-text)]' },
}

const ROLE_STYLES: Record<NarrativeRole, string> = {
  contrarian: 'bg-red-50 text-red-700',
  framework:  'bg-green-50 text-green-700',
  evidence:   'bg-amber-50 text-amber-700',
  cta:        'bg-pink-50 text-pink-700',
  tension:    'bg-red-50 text-red-700',
  founder:    'bg-purple-50 text-purple-700',
}

export function ConceptCard({
  concept,
  isSelected,
  onSelect,
  showCausalArrow = false,
}: ConceptCardProps) {
  const goalStyle = concept.goal
    ? GOAL_STYLES[concept.goal]
    : { card: 'bg-white border-zinc-200', badge: 'bg-zinc-100 text-zinc-500' }

  return (
    <div className="relative">
      <div
        onClick={onSelect}
        className={cn(
          'rounded-xl p-2.5 cursor-pointer flex flex-col gap-1.5',
          'border border-l-[3px] shadow-sm transition-shadow',
          goalStyle.card,
          isSelected && 'outline outline-2 outline-offset-1 outline-indigo-500',
          'hover:shadow-md'
        )}
      >
        {/* Goal badge */}
        {concept.goal && (
          <span
            className={cn(
              'self-start text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
              goalStyle.badge
            )}
          >
            {concept.goal}
          </span>
        )}

        {/* Headline */}
        <p className="text-[12px] font-black text-zinc-900 leading-[1.3] tracking-tight">
          {concept.headline}
        </p>

        {/* Role + lens tags */}
        <div className="flex flex-wrap gap-1">
          {concept.narrativeRole && (
            <span
              className={cn(
                'text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                ROLE_STYLES[concept.narrativeRole]
              )}
            >
              {concept.narrativeRole}
            </span>
          )}
          {concept.lensNames.map((lens) => (
            <span
              key={lens}
              className="text-[9px] text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded font-medium"
            >
              #{lens}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-black/5 mx-0" />

        {/* Platform variants */}
        <PlatformVariantStrip posts={concept.posts} />
      </div>

      {/* Causality arrow */}
      {showCausalArrow && (
        <span className="absolute -right-4 top-5 text-zinc-300 text-xs pointer-events-none select-none">
          →
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/calendar/grid/
git commit -m "feat: add ConceptCard, PlatformVariantStrip, PlatformPill components"
```

---

### Task 8: DetailPanel

**Files:**
- Create: `components/calendar/detail/PlatformPostRow.tsx`
- Create: `components/calendar/detail/DetailPanel.tsx`

- [ ] **Step 1: Create `components/calendar/detail/PlatformPostRow.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { PlatformIcon } from '@/components/platform-icons'
import type { CalendarPost } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface PlatformPostRowProps {
  post: CalendarPost
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  approved:   { text: 'Approved',   cls: 'text-green-700' },
  queued:     { text: 'Queued',     cls: 'text-purple-700' },
  publishing: { text: 'Publishing', cls: 'text-blue-700' },
  published:  { text: 'Published',  cls: 'text-zinc-500' },
  failed:     { text: 'Failed',     cls: 'text-red-700' },
  draft:      { text: 'Draft',      cls: 'text-zinc-400' },
  review:     { text: 'In Review',  cls: 'text-amber-700' },
}

export function PlatformPostRow({ post }: PlatformPostRowProps) {
  const router = useRouter()
  const status = STATUS_LABEL[post.status] ?? STATUS_LABEL.draft

  return (
    <button
      onClick={() => router.push(`/studio/${post.id}`)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left',
        'bg-zinc-50 border border-zinc-100 hover:bg-white hover:border-zinc-300',
        'transition-all cursor-pointer'
      )}
    >
      <PlatformIcon platform={post.platform} size={18} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-zinc-800 capitalize">
          {post.platform.replace(/_/g, ' ')}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{post.accountName}</p>
      </div>
      <span className={cn('text-[9px] font-bold uppercase tracking-wide', status.cls)}>
        {status.text}
      </span>
      <span className="text-zinc-300 text-xs">›</span>
    </button>
  )
}
```

- [ ] **Step 2: Create `components/calendar/detail/DetailPanel.tsx`**

```typescript
'use client'

import { PlatformPostRow } from './PlatformPostRow'
import type { CalendarConcept, NarrativeGoal, NarrativeRole } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface DetailPanelProps {
  concept: CalendarConcept | null
}

const GOAL_TEXT_CLASS: Record<NarrativeGoal, string> = {
  authority: 'text-[var(--goal-authority-text)]',
  conversation: 'text-[var(--goal-conversation-text)]',
  leads: 'text-[var(--goal-leads-text)]',
  loyalty: 'text-[var(--goal-loyalty-text)]',
  education: 'text-[var(--goal-education-text)]',
  subscribers: 'text-[var(--goal-subscribers-text)]',
  positioning: 'text-[var(--goal-positioning-text)]',
  retention: 'text-[var(--goal-retention-text)]',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">
      {children}
    </p>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <p className="text-[11px] font-semibold text-zinc-700">{value}</p>
    </div>
  )
}

export function DetailPanel({ concept }: DetailPanelProps) {
  if (!concept) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
        <span className="text-2xl text-zinc-200">⬡</span>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Select a concept to see all platform posts and strategic context
        </p>
      </div>
    )
  }

  const goalTextClass = concept.goal ? GOAL_TEXT_CLASS[concept.goal] : 'text-zinc-500'
  const totalPosts = concept.posts.length

  return (
    <div className="p-4 flex flex-col gap-0 overflow-y-auto">
      {/* Concept */}
      <div className="mb-4">
        <SectionLabel>Concept</SectionLabel>
        <p className="text-[14px] font-black text-zinc-900 leading-snug tracking-tight mb-3">
          {concept.headline}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {concept.goal && (
            <div>
              <p className="text-[9px] uppercase tracking-wide text-zinc-400 mb-0.5">Goal</p>
              <p className={cn('text-[11px] font-bold capitalize', goalTextClass)}>
                {concept.goal}
              </p>
            </div>
          )}
          {concept.narrativeRole && (
            <MetaRow
              label="Role"
              value={concept.narrativeRole.charAt(0).toUpperCase() + concept.narrativeRole.slice(1)}
            />
          )}
          {concept.funnelStage && (
            <MetaRow
              label="Funnel Stage"
              value={concept.funnelStage.charAt(0).toUpperCase() + concept.funnelStage.slice(1)}
            />
          )}
          {concept.resonancePrediction && (
            <MetaRow
              label="Resonance"
              value={concept.resonancePrediction.charAt(0).toUpperCase() + concept.resonancePrediction.slice(1)}
            />
          )}
        </div>
      </div>

      <hr className="border-zinc-100 mb-4" />

      {/* Platform posts */}
      <div className="mb-4">
        <SectionLabel>
          Platform Posts — {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
        </SectionLabel>
        <div className="flex flex-col gap-1.5">
          {concept.posts.map((post) => (
            <PlatformPostRow key={post.id} post={post} />
          ))}
        </div>
      </div>

      <hr className="border-zinc-100 mb-4" />

      {/* Arc */}
      {concept.narrativeArcName && (
        <>
          <div className="mb-4">
            <SectionLabel>Narrative Arc</SectionLabel>
            <p className="text-[12px] font-bold text-zinc-800">
              {concept.narrativeArcName}
            </p>
          </div>
          <hr className="border-zinc-100 mb-4" />
        </>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-zinc-900 text-white border border-zinc-900 cursor-pointer hover:bg-zinc-700 transition-colors">
          Publish All →
        </button>
        <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white text-zinc-600 border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors">
          Edit Concept
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/calendar/detail/
git commit -m "feat: add DetailPanel and PlatformPostRow components"
```

---

### Task 9: IntelligenceBar

**Files:**
- Create: `components/calendar/IntelligenceBar.tsx`

- [ ] **Step 1: Create `components/calendar/IntelligenceBar.tsx`**

```typescript
'use client'

import type { IntelligenceSignal, IntelligenceLevel } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface IntelligenceBarProps {
  signals: IntelligenceSignal[]
}

const SIGNAL_STYLES: Record<
  IntelligenceLevel,
  { bar: string; dot: string }
> = {
  danger: {
    bar: 'border-red-200 bg-red-50',
    dot: 'bg-red-500',
  },
  warn: {
    bar: 'border-amber-200 bg-amber-50',
    dot: 'bg-amber-500',
  },
  good: {
    bar: 'border-green-200 bg-green-50',
    dot: 'bg-green-500',
  },
}

function Signal({ signal }: { signal: IntelligenceSignal }) {
  const styles = SIGNAL_STYLES[signal.level]
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 flex-shrink-0 rounded-md border px-2.5 py-1.5',
        'text-[11px] whitespace-nowrap',
        styles.bar
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', styles.dot)} />
      <span className="text-zinc-600">
        <strong className="text-zinc-800 font-semibold">{signal.label}</strong>{' '}
        {signal.detail}
      </span>
    </div>
  )
}

export function IntelligenceBar({ signals }: IntelligenceBarProps) {
  if (signals.length === 0) return null

  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2 flex items-center gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 whitespace-nowrap flex-shrink-0">
        Intelligence
      </span>
      {signals.map((signal, i) => (
        <Signal key={i} signal={signal} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/calendar/IntelligenceBar.tsx
git commit -m "feat: add IntelligenceBar component"
```

---

## Phase 3: Calendar Page Assembly

---

### Task 10: GridView

**Files:**
- Create: `components/calendar/grid/DayHeader.tsx`
- Create: `components/calendar/grid/GridView.tsx`

- [ ] **Step 1: Create `components/calendar/grid/DayHeader.tsx`**

```typescript
import { cn } from '@/lib/utils'

const DAY_INTENTS: Record<number, string> = {
  1: 'Conversation · Tension',
  2: 'Authority · Education',
  3: 'Proof · Evidence',
  4: 'Lead Generation',
  5: 'Founder Narrative',
  6: 'Evergreen',
  0: 'Evergreen',
}

interface DayHeaderProps {
  date: Date
  isToday: boolean
}

export function DayHeader({ date, isToday }: DayHeaderProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[date.getUTCDay()]
  const dayNum = date.getUTCDate()
  const intent = DAY_INTENTS[date.getUTCDay()]

  return (
    <div className="text-center pb-1">
      <p
        className={cn(
          'text-[11px] font-bold uppercase tracking-wide',
          isToday ? 'text-indigo-600' : 'text-zinc-400'
        )}
      >
        {dayName} {dayNum}
        {isToday && ' ·'}
      </p>
      <p
        className={cn(
          'text-[9px] mt-0.5',
          isToday ? 'text-indigo-400' : 'text-zinc-300'
        )}
      >
        {intent}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/calendar/grid/GridView.tsx`**

```typescript
'use client'

import { DayHeader } from './DayHeader'
import { ConceptCard } from './ConceptCard'
import type { CalendarConcept } from '@/types/calendar'

const TIME_SLOTS = [
  { label: '7am', hour: 7 },
  { label: '9am', hour: 9 },
  { label: '12pm', hour: 12 },
  { label: '2pm', hour: 14 },
  { label: '5pm', hour: 17 },
]

interface GridViewProps {
  concepts: CalendarConcept[]
  weekStart: string
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

function getWeekDates(weekStart: string): Date[] {
  const start = new Date(weekStart)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

export function GridView({
  concepts,
  weekStart,
  selectedConceptId,
  onSelectConcept,
}: GridViewProps) {
  const days = getWeekDates(weekStart)
  const today = new Date()

  // Map day-index → hour → concepts
  function getConceptsForSlot(day: Date, hour: number): CalendarConcept[] {
    return concepts.filter((c) => {
      const d = new Date(c.scheduledAt)
      return isSameDay(d, day) && d.getUTCHours() === hour
    })
  }

  if (concepts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <span className="text-4xl text-zinc-200">⬡</span>
        <p className="text-[13px] font-semibold text-zinc-400">
          No concepts scheduled this week
        </p>
        <p className="text-[11px] text-zinc-300">
          Generate from signals or create manually
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-[44px_repeat(5,1fr)] gap-2 mb-2">
        <div />
        {days.map((day, i) => (
          <DayHeader key={i} date={day} isToday={isSameDay(day, today)} />
        ))}
      </div>

      {/* Time rows */}
      <div className="flex flex-col gap-2">
        {TIME_SLOTS.map(({ label, hour }) => (
          <div
            key={hour}
            className="grid grid-cols-[44px_repeat(5,1fr)] gap-2 items-start"
          >
            {/* Time label */}
            <div className="text-[9px] text-zinc-300 text-right pr-2 pt-2.5 tracking-wide">
              {label}
            </div>

            {/* Day cells */}
            {days.map((day, dayIdx) => {
              const slotConcepts = getConceptsForSlot(day, hour)

              if (slotConcepts.length === 0) {
                return (
                  <div
                    key={dayIdx}
                    className="min-h-[52px] rounded-lg bg-white border border-zinc-100"
                  />
                )
              }

              return (
                <div key={dayIdx} className="flex flex-col gap-2">
                  {slotConcepts.map((concept, idx) => (
                    <ConceptCard
                      key={concept.conceptId}
                      concept={concept}
                      isSelected={selectedConceptId === concept.conceptId}
                      onSelect={() => onSelectConcept(concept.conceptId)}
                      showCausalArrow={
                        idx === slotConcepts.length - 1 &&
                        concept.narrativeArcId !== null &&
                        dayIdx < 4
                      }
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/calendar/grid/DayHeader.tsx components/calendar/grid/GridView.tsx
git commit -m "feat: add GridView with day headers and time slot grid"
```

---

### Task 11: CalendarToolbar + CalendarPage

**Files:**
- Create: `components/calendar/CalendarToolbar.tsx`
- Create: `components/calendar/CalendarPage.tsx`
- Create: `app/(dashboard)/calendar/page.tsx`

- [ ] **Step 1: Create `components/calendar/CalendarToolbar.tsx`**

```typescript
'use client'

import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'narrative'

interface CalendarToolbarProps {
  weekStart: string
  conceptCount: number
  postCount: number
  healthScore: number
  viewMode: ViewMode
  onPrevWeek: () => void
  onNextWeek: () => void
  onViewModeChange: (mode: ViewMode) => void
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setUTCDate(end.getUTCDate() + 6)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${months[start.getUTCMonth()]} ${start.getUTCDate()} – ${end.getUTCDate()}, ${start.getUTCFullYear()}`
  }
  return `${months[start.getUTCMonth()]} ${start.getUTCDate()} – ${months[end.getUTCMonth()]} ${end.getUTCDate()}, ${start.getUTCFullYear()}`
}

export function CalendarToolbar({
  weekStart,
  conceptCount,
  postCount,
  healthScore,
  viewMode,
  onPrevWeek,
  onNextWeek,
  onViewModeChange,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onPrevWeek}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          ← Prev
        </button>
        <div>
          <p className="text-[15px] font-black text-zinc-900 tracking-tight">
            {formatWeekLabel(weekStart)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {conceptCount} concepts · {postCount} posts · Narrative health {healthScore}%
          </p>
        </div>
        <button
          onClick={onNextWeek}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          Next →
        </button>
      </div>

      <div className="flex bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 gap-0.5">
        {(['grid', 'narrative'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              'px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer',
              viewMode === mode
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-600'
            )}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/calendar/CalendarPage.tsx`**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { IntelligenceBar } from './IntelligenceBar'
import { CalendarToolbar } from './CalendarToolbar'
import { GridView } from './grid/GridView'
import { NarrativeView } from './narrative/NarrativeView'
import { DetailPanel } from './detail/DetailPanel'
import type {
  CalendarConcept,
  IntelligenceSignal,
  NarrativeArc,
  NarrativeHealth,
} from '@/types/calendar'

function getWeekStart(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function addWeeks(weekStart: string, n: number): string {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().split('T')[0]
}

export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(new Date().toISOString().split('T')[0])
  )
  const [viewMode, setViewMode] = useState<'grid' | 'narrative'>('grid')
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null)
  const [concepts, setConcepts] = useState<CalendarConcept[]>([])
  const [arcs, setArcs] = useState<NarrativeArc[]>([])
  const [signals, setSignals] = useState<IntelligenceSignal[]>([])
  const [health, setHealth] = useState<NarrativeHealth>({ score: 0, strengths: [], gaps: [] })
  const [loading, setLoading] = useState(true)

  const fetchWeek = useCallback(async (week: string) => {
    setLoading(true)
    try {
      const [calRes, healthRes, arcsRes] = await Promise.all([
        fetch(`/api/calendar?week=${week}`),
        fetch('/api/narrative-health'),
        fetch(`/api/narrative-arcs?week=${week}`),
      ])
      const [calData, healthData, arcsData] = await Promise.all([
        calRes.json(),
        healthRes.json(),
        arcsRes.json(),
      ])
      setConcepts(calData.concepts ?? [])
      setHealth(healthData.health ?? { score: 0, strengths: [], gaps: [] })
      setSignals(healthData.signals ?? [])
      setArcs(arcsData.arcs ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWeek(weekStart) }, [weekStart, fetchWeek])

  const selectedConcept =
    concepts.find((c) => c.conceptId === selectedConceptId) ?? null

  const totalPosts = concepts.reduce((sum, c) => sum + c.posts.length, 0)

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <IntelligenceBar signals={signals} />
      <CalendarToolbar
        weekStart={weekStart}
        conceptCount={concepts.length}
        postCount={totalPosts}
        healthScore={health.score}
        viewMode={viewMode}
        onPrevWeek={() => setWeekStart(addWeeks(weekStart, -1))}
        onNextWeek={() => setWeekStart(addWeeks(weekStart, 1))}
        onViewModeChange={setViewMode}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-16 text-zinc-300 text-sm">Loading...</div>
          ) : viewMode === 'grid' ? (
            <GridView
              concepts={concepts}
              weekStart={weekStart}
              selectedConceptId={selectedConceptId}
              onSelectConcept={setSelectedConceptId}
            />
          ) : (
            <NarrativeView
              arcs={arcs}
              health={health}
              selectedConceptId={selectedConceptId}
              onSelectConcept={setSelectedConceptId}
            />
          )}
        </div>

        <div className="w-[296px] border-l border-zinc-200 bg-white flex-shrink-0 overflow-y-auto">
          <DetailPanel concept={selectedConcept} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/calendar/page.tsx`**

```typescript
import { CalendarPage } from '@/components/calendar/CalendarPage'

export default function Page() {
  return <CalendarPage />
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3000/calendar`. The page should render — even with empty data, the grid skeleton and toolbar should display.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/CalendarToolbar.tsx components/calendar/CalendarPage.tsx app/\(dashboard\)/calendar/page.tsx
git commit -m "feat: add CalendarToolbar, CalendarPage, and /calendar route"
```

---

## Phase 4: Narrative View

---

### Task 12: Narrative View Components

**Files:**
- Create: `components/calendar/narrative/NarrativeHealthPanel.tsx`
- Create: `components/calendar/narrative/FunnelProgress.tsx`
- Create: `components/calendar/narrative/ArcBlock.tsx`
- Create: `components/calendar/narrative/NarrativeView.tsx`

- [ ] **Step 1: Create `components/calendar/narrative/NarrativeHealthPanel.tsx`**

```typescript
import type { NarrativeHealth } from '@/types/calendar'

interface NarrativeHealthPanelProps {
  health: NarrativeHealth
}

export function NarrativeHealthPanel({ health }: NarrativeHealthPanelProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Narrative Health
        </span>
        <span className="text-[20px] font-black text-amber-600 tracking-tight">
          {health.score}%{' '}
          <span className="text-[11px] font-medium text-zinc-400">/ 100</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">
            Strengths
          </p>
          {health.strengths.map((s, i) => (
            <p key={i} className="text-[11px] text-green-700 flex gap-1.5 leading-snug mb-1">
              <span className="flex-shrink-0">✓</span>
              {s}
            </p>
          ))}
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">
            Gaps
          </p>
          {health.gaps.map((g, i) => (
            <p key={i} className="text-[11px] text-red-700 flex gap-1.5 leading-snug mb-1">
              <span className="flex-shrink-0">×</span>
              {g}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/calendar/narrative/FunnelProgress.tsx`**

```typescript
import type { ArcFunnelStep } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface FunnelProgressProps {
  steps: ArcFunnelStep[]
}

export function FunnelProgress({ steps }: FunnelProgressProps) {
  return (
    <div className="bg-zinc-50 border-l border-r border-zinc-200 px-4 py-2.5 flex items-center overflow-x-auto [scrollbar-width:none]">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-[70px]">
          <div className="flex-1 text-center">
            <p
              className={cn(
                'text-[9px] font-bold uppercase tracking-wide mb-1',
                step.state === 'done'
                  ? 'text-zinc-400'
                  : step.state === 'active'
                  ? 'text-indigo-600'
                  : 'text-zinc-200'
              )}
            >
              {step.label}
            </p>
            <div
              className={cn(
                'w-2 h-2 rounded-full mx-auto border',
                step.state === 'done'
                  ? 'bg-zinc-400 border-zinc-500'
                  : step.state === 'active'
                  ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)]'
                  : 'bg-zinc-200 border-zinc-300'
              )}
            />
          </div>
          {i < steps.length - 1 && (
            <span className="text-zinc-200 text-xs mx-1 flex-shrink-0">→</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/calendar/narrative/ArcBlock.tsx`**

```typescript
'use client'

import type { NarrativeArc } from '@/types/calendar'
import { FunnelProgress } from './FunnelProgress'
import { ConceptCard } from '@/components/calendar/grid/ConceptCard'
import { cn } from '@/lib/utils'

interface ArcBlockProps {
  arc: NarrativeArc
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

export function ArcBlock({ arc, selectedConceptId, onSelectConcept }: ArcBlockProps) {
  return (
    <div className="mb-5">
      {/* Arc header */}
      <div className="bg-white border border-zinc-200 rounded-t-xl px-4 py-3 flex gap-4 items-start shadow-sm">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
            Strategic Arc
          </p>
          <p className="text-[16px] font-black text-zinc-900 tracking-tight leading-tight mb-1">
            {arc.arcName}
          </p>
          {arc.arcDescription && (
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-2">
              {arc.arcDescription}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
              Active
            </span>
            {arc.resonance && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                Resonance: {arc.resonance}
              </span>
            )}
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-zinc-50 text-zinc-500 border-zinc-200">
              {arc.stage}
            </span>
            {arc.platforms.length > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-zinc-50 text-zinc-500 border-zinc-200">
                {arc.platforms.slice(0, 3).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-[13px] font-black text-zinc-800">{arc.totalConcepts}</p>
            <p className="text-[9px] uppercase tracking-wide text-zinc-400">Concepts</p>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-black text-zinc-800">{arc.totalPosts}</p>
            <p className="text-[9px] uppercase tracking-wide text-zinc-400">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-black text-zinc-800">Wk {arc.weeksRunning}</p>
            <p className="text-[9px] uppercase tracking-wide text-zinc-400">Running</p>
          </div>
        </div>
      </div>

      {/* Funnel progress */}
      <FunnelProgress steps={arc.funnelSteps} />

      {/* Concept cards */}
      <div className="border border-t-0 border-zinc-200 rounded-b-xl bg-zinc-50 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] pb-1">
          {arc.concepts.map((concept) => (
            <div key={concept.conceptId} className="flex-shrink-0 w-[220px]">
              <ConceptCard
                concept={concept}
                isSelected={selectedConceptId === concept.conceptId}
                onSelect={() => onSelectConcept(concept.conceptId)}
              />
            </div>
          ))}
          <div className="flex-shrink-0 w-[140px] min-h-[80px] border border-dashed border-zinc-300 rounded-xl flex items-center justify-center text-[11px] font-semibold text-zinc-400 cursor-pointer hover:border-zinc-400 hover:text-zinc-500 transition-colors">
            + Add to arc
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/calendar/narrative/NarrativeView.tsx`**

```typescript
'use client'

import type { NarrativeArc, NarrativeHealth } from '@/types/calendar'
import { NarrativeHealthPanel } from './NarrativeHealthPanel'
import { ArcBlock } from './ArcBlock'

interface NarrativeViewProps {
  arcs: NarrativeArc[]
  health: NarrativeHealth
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

export function NarrativeView({
  arcs,
  health,
  selectedConceptId,
  onSelectConcept,
}: NarrativeViewProps) {
  return (
    <div>
      <NarrativeHealthPanel health={health} />

      {arcs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl text-zinc-200">⬡</span>
          <p className="text-[13px] font-semibold text-zinc-400">
            No narrative arcs this week
          </p>
          <p className="text-[11px] text-zinc-300">
            Arcs are assigned automatically when Clout detects related content
          </p>
        </div>
      ) : (
        arcs.map((arc) => (
          <ArcBlock
            key={arc.arcId}
            arc={arc}
            selectedConceptId={selectedConceptId}
            onSelectConcept={onSelectConcept}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run dev
```

Open `/calendar`, toggle to Narrative view. Health panel and arc blocks should render.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/narrative/
git commit -m "feat: add NarrativeView with health panel, arc blocks, funnel progress"
```

---

## Phase 5: Navigation

---

### Task 13: Sidebar + Redirects

**Files:**
- Modify: `components/shell/sidebar.tsx`
- Modify: `app/(dashboard)/inbox/page.tsx`
- Modify: `app/(dashboard)/queue/page.tsx`

- [ ] **Step 1: Add Calendar to sidebar, remove Inbox and Queue**

Open `components/shell/sidebar.tsx` and find the `navItems` array (or equivalent). Make these changes:

1. Add a Calendar entry:
```typescript
{ href: '/calendar', label: 'Calendar', icon: CalendarDaysIcon }
```
(Import `CalendarDays` from `lucide-react`)

2. Remove or comment out the Inbox and Queue entries.

3. Move Calendar above any remaining Analyze/Syndicate items so it's prominent in the nav.

- [ ] **Step 2: Replace `app/(dashboard)/inbox/page.tsx` with a redirect**

```typescript
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/calendar')
}
```

- [ ] **Step 3: Replace `app/(dashboard)/queue/page.tsx` with a redirect**

```typescript
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/calendar')
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run dev
```

Navigate to `/inbox` and `/queue` — both should redirect to `/calendar`. Calendar should appear in sidebar.

- [ ] **Step 5: Commit**

```bash
git add components/shell/sidebar.tsx app/\(dashboard\)/inbox/page.tsx app/\(dashboard\)/queue/page.tsx
git commit -m "feat: add Calendar to sidebar, redirect /inbox and /queue to /calendar"
```

---

## Phase 6: Platform-Native Post Editor

---

### Task 14: Platform Preview Components

**Files:**
- Create: `components/studio/previews/LinkedInPreview.tsx`
- Create: `components/studio/previews/XPreview.tsx`
- Create: `components/studio/previews/ThreadsPreview.tsx`
- Create: `components/studio/previews/NewsletterPreview.tsx`
- Create: `components/studio/PlatformPreview.tsx`

- [ ] **Step 1: Create `components/studio/previews/LinkedInPreview.tsx`**

```typescript
interface LinkedInPreviewProps {
  accountName: string
  handle: string
  body: string
  avatarUrl?: string
}

export function LinkedInPreview({
  accountName,
  handle,
  body,
  avatarUrl,
}: LinkedInPreviewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-[520px] shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200 flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-300 flex items-center justify-center text-zinc-500 text-[13px] font-bold">
              {accountName.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">{accountName}</p>
          <p className="text-[11px] text-zinc-500">{handle}</p>
          <p className="text-[11px] text-zinc-400">1st • Just now</p>
        </div>
        <div className="ml-auto">
          <div
            className="text-[12px] font-bold px-3 py-1 rounded-full border"
            style={{ color: '#0077B5', borderColor: '#0077B5' }}
          >
            + Follow
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap mb-3">
        {body || <span className="text-zinc-300">Write your post...</span>}
      </div>

      {/* Reaction bar */}
      <div className="border-t border-zinc-100 pt-2.5 flex gap-4">
        {['👍 Like', '💬 Comment', '🔁 Repost', '📤 Send'].map((action) => (
          <button
            key={action}
            className="text-[11px] text-zinc-500 font-semibold hover:text-zinc-700 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/studio/previews/XPreview.tsx`**

```typescript
const X_CHAR_LIMIT = 280

interface XPreviewProps {
  handle: string
  displayName: string
  body: string
  avatarUrl?: string
}

export function XPreview({ handle, displayName, body, avatarUrl }: XPreviewProps) {
  const charCount = body.length
  const overLimit = charCount > X_CHAR_LIMIT
  const displayBody = overLimit ? body.slice(0, X_CHAR_LIMIT) : body

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-[480px] shadow-sm font-sans">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-200 flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white text-[12px] font-bold">
              {displayName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-[13px] font-bold text-zinc-900">{displayName}</span>
            <span className="text-[12px] text-zinc-500">{handle}</span>
            <span className="text-[12px] text-zinc-400">· now</span>
          </div>
          <p className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap mb-3">
            {displayBody || <span className="text-zinc-300">Write your post...</span>}
            {overLimit && (
              <span className="text-red-500"> [truncated at {X_CHAR_LIMIT} chars]</span>
            )}
          </p>
          <div className="flex items-center gap-5">
            {['💬', '🔁', '♥', '📊', '📤'].map((icon) => (
              <span key={icon} className="text-zinc-400 text-[14px] cursor-pointer hover:text-zinc-600">
                {icon}
              </span>
            ))}
            <span
              className={`text-[11px] font-bold ml-auto ${
                overLimit ? 'text-red-500' : charCount > 240 ? 'text-amber-500' : 'text-zinc-400'
              }`}
            >
              {X_CHAR_LIMIT - charCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/studio/previews/ThreadsPreview.tsx`**

```typescript
interface ThreadsPreviewProps {
  handle: string
  body: string
  avatarUrl?: string
}

export function ThreadsPreview({ handle, body, avatarUrl }: ThreadsPreviewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-[440px] shadow-sm font-sans">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white text-[11px] font-bold">
                {handle.charAt(1) ?? 'T'}
              </div>
            )}
          </div>
          <div className="w-px flex-1 bg-zinc-100 min-h-[20px]" />
        </div>
        <div className="flex-1 min-w-0 pb-3">
          <p className="text-[13px] font-bold text-zinc-900 mb-1">{handle}</p>
          <p className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {body || <span className="text-zinc-300">Write your post...</span>}
          </p>
          <div className="flex gap-3 mt-3">
            {['♥', '💬', '🔁', '📤'].map((icon) => (
              <span key={icon} className="text-zinc-400 text-[14px] cursor-pointer hover:text-zinc-600">
                {icon}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/studio/previews/NewsletterPreview.tsx`**

```typescript
interface NewsletterPreviewProps {
  subject: string
  senderName: string
  body: string
}

export function NewsletterPreview({ subject, senderName, body }: NewsletterPreviewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden max-w-[560px] shadow-sm font-sans">
      {/* Email header */}
      <div className="bg-zinc-50 border-b border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-zinc-400 w-12">From</span>
          <span className="text-[11px] font-semibold text-zinc-700">{senderName}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-zinc-400 w-12 pt-0.5">Subject</span>
          <span className="text-[13px] font-bold text-zinc-900">
            {subject || 'Your newsletter subject...'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
          {body || <span className="text-zinc-300">Write your newsletter content...</span>}
        </p>
      </div>

      {/* Footer */}
      <div className="bg-zinc-50 border-t border-zinc-100 px-5 py-3 text-center">
        <p className="text-[10px] text-zinc-400">
          Unsubscribe · View in browser · {senderName}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/studio/PlatformPreview.tsx`**

```typescript
'use client'

import type { ChannelPlatform } from '@/types/domain'
import { LinkedInPreview } from './previews/LinkedInPreview'
import { XPreview } from './previews/XPreview'
import { ThreadsPreview } from './previews/ThreadsPreview'
import { NewsletterPreview } from './previews/NewsletterPreview'

interface PlatformPreviewProps {
  platform: ChannelPlatform
  accountName: string
  handle: string
  body: string
  subject?: string
  avatarUrl?: string
}

export function PlatformPreview({
  platform,
  accountName,
  handle,
  body,
  subject,
  avatarUrl,
}: PlatformPreviewProps) {
  switch (platform) {
    case 'linkedin':
      return (
        <LinkedInPreview
          accountName={accountName}
          handle={handle}
          body={body}
          avatarUrl={avatarUrl}
        />
      )
    case 'x':
    case 'twitter':
      return (
        <XPreview
          displayName={accountName}
          handle={handle}
          body={body}
          avatarUrl={avatarUrl}
        />
      )
    case 'threads':
      return (
        <ThreadsPreview handle={handle} body={body} avatarUrl={avatarUrl} />
      )
    case 'newsletter':
      return (
        <NewsletterPreview
          subject={subject ?? ''}
          senderName={accountName}
          body={body}
        />
      )
    default:
      return (
        <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl p-6 text-center">
          <p className="text-[12px] text-zinc-400">
            Preview not available for{' '}
            <span className="font-semibold capitalize">{platform}</span>
          </p>
        </div>
      )
  }
}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add components/studio/previews/ components/studio/PlatformPreview.tsx
git commit -m "feat: add platform-native preview components (LinkedIn, X, Threads, Newsletter)"
```

---

### Task 15: Update `/studio/[id]` to Platform-Native Editor

**Files:**
- Create: `components/studio/PlatformTabs.tsx`
- Modify: `app/(dashboard)/studio/[id]/page.tsx`

- [ ] **Step 1: Create `components/studio/PlatformTabs.tsx`**

```typescript
'use client'

import { PlatformIcon } from '@/components/platform-icons'
import type { ChannelPlatform } from '@/types/domain'
import { cn } from '@/lib/utils'

interface PlatformTab {
  postId: string
  platform: ChannelPlatform
  accountName: string
  status: string
}

interface PlatformTabsProps {
  tabs: PlatformTab[]
  activePostId: string
  onSelectTab: (postId: string) => void
}

export function PlatformTabs({
  tabs,
  activePostId,
  onSelectTab,
}: PlatformTabsProps) {
  return (
    <div className="flex gap-1 border-b border-zinc-200 bg-white px-4 pt-3 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.postId}
          onClick={() => onSelectTab(tab.postId)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-semibold',
            'border border-b-0 transition-colors cursor-pointer whitespace-nowrap',
            activePostId === tab.postId
              ? 'bg-white border-zinc-200 text-zinc-900 -mb-px pb-[9px]'
              : 'bg-zinc-50 border-transparent text-zinc-400 hover:text-zinc-600'
          )}
        >
          <PlatformIcon platform={tab.platform} size={13} />
          <span>{tab.accountName}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `app/(dashboard)/studio/[id]/page.tsx`**

Read the current file first to preserve any existing data-fetching logic, then replace the render with the new two-panel layout. The key structural change is adding the `PlatformTabs` and `PlatformPreview` to the right side.

Replace the page with:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAutosave } from '@/hooks/use-autosave'
import { PlatformTabs } from '@/components/studio/PlatformTabs'
import { PlatformPreview } from '@/components/studio/PlatformPreview'
import type { Output } from '@/types/domain'
import type { ChannelPlatform } from '@/types/domain'

interface OutputWithChannel extends Output {
  channelPlatform: ChannelPlatform
  channelLabel: string
  channelHandle: string
}

export default function StudioPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [output, setOutput] = useState<OutputWithChannel | null>(null)
  const [conceptPosts, setConceptPosts] = useState<OutputWithChannel[]>([])
  const [activePostId, setActivePostId] = useState<string>(id)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/outputs/${id}`)
      if (!res.ok) { router.push('/calendar'); return }
      const data = await res.json()
      const out: OutputWithChannel = {
        ...data.output,
        channelPlatform: data.output.channels?.platform ?? 'linkedin',
        channelLabel: data.output.channels?.label ?? 'Unknown',
        channelHandle: data.output.channels?.account_id ?? '',
      }
      setOutput(out)
      setBody(out.content?.body ?? '')

      // Load sibling posts (same concept_id)
      if (out.conceptId) {
        const siblingsRes = await fetch(`/api/outputs?conceptId=${out.conceptId}`)
        if (siblingsRes.ok) {
          const siblingsData = await siblingsRes.json()
          setConceptPosts(
            (siblingsData.outputs ?? []).map((o: Output & { channels?: { platform?: string; label?: string; account_id?: string } }) => ({
              ...o,
              channelPlatform: o.channels?.platform ?? 'linkedin',
              channelLabel: o.channels?.label ?? 'Unknown',
              channelHandle: o.channels?.account_id ?? '',
            }))
          )
        }
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  const activePost = conceptPosts.find((p) => p.id === activePostId) ?? output

  const { saveStatus } = useAutosave({
    id: activePostId,
    body,
    title: output?.title ?? '',
    hashtags: (output?.content as { hashtags?: string[] } | null)?.hashtags ?? [],
    existingContent: output?.content ?? {},
  })

  if (loading || !output) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-400 text-sm">
        Loading...
      </div>
    )
  }

  const platformTabs = conceptPosts.length > 0
    ? conceptPosts.map((p) => ({
        postId: p.id,
        platform: p.channelPlatform,
        accountName: p.channelLabel,
        status: p.status,
      }))
    : [{
        postId: output.id,
        platform: output.channelPlatform,
        accountName: output.channelLabel,
        status: output.status,
      }]

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      {/* Platform tabs */}
      <PlatformTabs
        tabs={platformTabs}
        activePostId={activePostId}
        onSelectTab={setActivePostId}
      />

      {/* Two-panel editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[600px] mx-auto">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full min-h-[280px] text-[14px] text-zinc-900 font-medium leading-relaxed
                         resize-none border-0 bg-transparent outline-none placeholder:text-zinc-300"
              placeholder="Write your post..."
            />
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[11px] text-zinc-400">{saveStatus}</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => router.push('/calendar')}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  ← Calendar
                </button>
                <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-zinc-900 text-white cursor-pointer hover:bg-zinc-700">
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: platform preview */}
        <div className="w-[520px] border-l border-zinc-200 bg-white overflow-y-auto p-6 flex-shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-4">
            Preview — {activePost?.channelPlatform ?? output.channelPlatform}
          </p>
          <PlatformPreview
            platform={activePost?.channelPlatform ?? output.channelPlatform}
            accountName={activePost?.channelLabel ?? output.channelLabel}
            handle={activePost?.channelHandle ?? output.channelHandle}
            body={activePostId === output.id ? body : activePost?.content?.body ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Check that `/api/outputs` supports `?conceptId=` query param**

Run:
```bash
grep -r "conceptId\|concept_id" app/api/outputs/route.ts 2>/dev/null | head -5
```

If the `GET /api/outputs` route doesn't support filtering by `conceptId`, add it:

In `app/api/outputs/route.ts`, in the GET handler, after existing filters, add:
```typescript
const conceptId = new URL(req.url).searchParams.get('conceptId')
if (conceptId) {
  query = query.eq('concept_id', conceptId)
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run dev
```

Open a post in the studio. Platform tabs should appear. Right panel should show the platform preview updating as you type.

- [ ] **Step 5: Commit**

```bash
git add components/studio/PlatformTabs.tsx app/\(dashboard\)/studio/
git commit -m "feat: update studio editor with platform tabs and native platform previews"
```

---

## Self-Review Checklist

### Spec coverage

| Spec Requirement | Task |
|---|---|
| DB migration — new columns | Task 3 |
| Goal color system | Task 1 |
| Calendar types | Task 2 |
| `/api/calendar` | Task 5 |
| `/api/narrative-health` + `/api/narrative-arcs` | Task 5 |
| `PATCH /api/outputs/[id]/narrative` | Task 5 |
| `PlatformIcon` | Task 6 |
| `ConceptCard` + platform strip | Task 7 |
| `DetailPanel` | Task 8 |
| `IntelligenceBar` | Task 9 |
| `GridView` | Task 10 |
| Calendar page + toolbar | Task 11 |
| `NarrativeView` + health + arcs | Task 12 |
| Sidebar + redirects | Task 13 |
| Platform previews | Task 14 |
| Updated studio editor | Task 15 |
| Keyboard shortcuts | ⚠️ Not implemented — add J/K/N/E navigation to `CalendarPage.tsx` after Task 11 if time allows |
| Skeleton loading states | ⚠️ Only basic "Loading..." text — replace with proper skeletons in a follow-up |
| Mobile bottom sheet | ⚠️ Not implemented — mobile behavior is a follow-up |

### Known gaps (acceptable for first ship)
- Keyboard navigation: add a `useEffect` with `window.addEventListener('keydown', ...)` in `CalendarPage.tsx` after Phase 3 is working
- Proper skeleton states: replace loading divs with shadcn `Skeleton` components
- Mobile behavior: detail panel bottom sheet and single-day mobile calendar
