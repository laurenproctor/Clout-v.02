# Feed Onboarding Nav + Admin Signal Feed Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the anonymous progress bar in the feed onboarding with named, clickable step segments, and add a Signal Feed settings page to the Admin tab so users can edit their feed configuration after onboarding.

**Architecture:** Pure function addition first (`mapToneToVoices`), then a thin API route (`GET /api/feed/settings`) to load existing config, then UI changes to OnboardingFlow and the admin sidebar, and finally the new settings page that wires the selectors to load/save.

**Tech Stack:** Next.js App Router, React client components, Supabase (server client via `createClient()`), Vitest for unit tests, Tailwind + inline styles (matching existing feed components).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/feed/toneMapping.ts` | Modify | Add `mapToneToVoices` inverse function |
| `lib/feed/__tests__/toneMapping.test.ts` | Create | Unit tests for both mapping functions |
| `app/api/feed/settings/route.ts` | Create | GET — load user feed settings from `user_profiles` |
| `components/feed/OnboardingFlow.tsx` | Modify | Replace progress bar + "X of 4" with named segment bar |
| `components/shell/sidebar.tsx` | Modify | Add Signal Feed to `adminItems`; exclude from Settings catch-all |
| `app/(dashboard)/settings/feed/page.tsx` | Create | Admin settings page for feed configuration |

---

## Task 1: Add `mapToneToVoices` to toneMapping.ts

**Files:**
- Modify: `lib/feed/toneMapping.ts`
- Create: `lib/feed/__tests__/toneMapping.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/feed/__tests__/toneMapping.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapVoicesToTone, mapToneToVoices } from '../toneMapping'
import type { TonePreference } from '@/types/feed'

describe('mapVoicesToTone', () => {
  it('returns authoritative for analytical voices', () => {
    expect(mapVoicesToTone(['Analytical', 'Executive'])).toBe('authoritative')
  })

  it('returns conversational for educational voices', () => {
    expect(mapVoicesToTone(['Educational', 'Cultural'])).toBe('conversational')
  })

  it('returns provocative for contrarian voices', () => {
    expect(mapVoicesToTone(['Contrarian', 'Visionary'])).toBe('provocative')
  })

  it('defaults to authoritative for empty array', () => {
    expect(mapVoicesToTone([])).toBe('authoritative')
  })
})

describe('mapToneToVoices', () => {
  it('returns authoritative voices for authoritative tone', () => {
    expect(mapToneToVoices('authoritative')).toEqual(['Analytical', 'Executive', 'Technical'])
  })

  it('returns conversational voices for conversational tone', () => {
    expect(mapToneToVoices('conversational')).toEqual(['Educational', 'Cultural'])
  })

  it('returns provocative voices for provocative tone', () => {
    expect(mapToneToVoices('provocative')).toEqual(['Contrarian', 'Visionary'])
  })

  it('round-trips through mapVoicesToTone', () => {
    const tones: TonePreference[] = ['authoritative', 'conversational', 'provocative']
    for (const tone of tones) {
      expect(mapVoicesToTone(mapToneToVoices(tone))).toBe(tone)
    }
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx vitest run lib/feed/__tests__/toneMapping.test.ts
```

Expected: `mapToneToVoices is not a function` (or similar import error).

- [ ] **Step 3: Add `mapToneToVoices` to toneMapping.ts**

Open `lib/feed/toneMapping.ts`. Current content:

```typescript
import type { TonePreference } from '@/types/feed'

export function mapVoicesToTone(voices: string[]): TonePreference {
  const scores = { authoritative: 0, conversational: 0, provocative: 0 }
  for (const v of voices) {
    if (['Analytical', 'Executive', 'Technical'].includes(v)) scores.authoritative++
    else if (['Educational', 'Cultural'].includes(v)) scores.conversational++
    else if (['Contrarian', 'Visionary'].includes(v)) scores.provocative++
  }
  const max = Math.max(scores.authoritative, scores.conversational, scores.provocative)
  if (max === 0) return 'authoritative'
  if (scores.authoritative === max) return 'authoritative'
  if (scores.conversational === max) return 'conversational'
  return 'provocative'
}
```

Append after the existing function:

```typescript
export function mapToneToVoices(tone: TonePreference): string[] {
  if (tone === 'authoritative') return ['Analytical', 'Executive', 'Technical']
  if (tone === 'conversational') return ['Educational', 'Cultural']
  return ['Contrarian', 'Visionary']
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx vitest run lib/feed/__tests__/toneMapping.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && git add lib/feed/toneMapping.ts lib/feed/__tests__/toneMapping.test.ts && git commit -m "feat: add mapToneToVoices inverse function with tests"
```

---

## Task 2: Add GET /api/feed/settings route

**Files:**
- Create: `app/api/feed/settings/route.ts`

The existing `app/api/feed/route.ts` is the signal-fetch endpoint — this is a new, separate file at `app/api/feed/settings/route.ts`.

- [ ] **Step 1: Create the route file**

Create `app/api/feed/settings/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { mapToneToVoices } from '@/lib/feed/toneMapping'
import type { TonePreference } from '@/types/feed'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('brand_name, content_topics, services, tone_preference, competitors')
    .eq('id', session.userId)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({
      brand_name: '',
      content_topics: [],
      services: [],
      competitors: [],
      editorial_voices: [],
    })
  }

  const rawCompetitors = (profile.competitors ?? []) as Array<{ name: string; handle: string; url: string }>
  const competitors = rawCompetitors.map(c => c.name)

  const editorial_voices = profile.tone_preference
    ? mapToneToVoices(profile.tone_preference as TonePreference)
    : []

  return NextResponse.json({
    brand_name: profile.brand_name ?? '',
    content_topics: profile.content_topics ?? [],
    services: profile.services ?? [],
    competitors,
    editorial_voices,
  })
}
```

- [ ] **Step 2: Verify the route is reachable**

Start the dev server if not already running (`npm run dev`), then in a browser or curl:

```bash
curl -s http://localhost:3000/api/feed/settings
```

Expected: `{"error":"Unauthorized"}` with 401 (no session cookie). If you get a 404, the file path is wrong.

- [ ] **Step 3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && git add app/api/feed/settings/route.ts && git commit -m "feat: add GET /api/feed/settings route"
```

---

## Task 3: Replace progress bar with named segment bar in OnboardingFlow

**Files:**
- Modify: `components/feed/OnboardingFlow.tsx`

- [ ] **Step 1: Add STEP_LABELS constant and remove `progress` variable**

Open `components/feed/OnboardingFlow.tsx`.

After the `STEPS` array (currently lines 11–28), add:

```typescript
const STEP_LABELS = ['Topics', 'Focus Areas', 'Competitors', 'Voice'] as const
```

Then find and remove the `progress` variable (currently line 44):

```typescript
const progress = ((step + 1) / STEPS.length) * 100
```

Delete that line entirely. It is no longer used.

- [ ] **Step 2: Replace the progress bar and step indicator**

Find this block in the render (currently around lines 103–130):

```tsx
{/* Progress bar */}
<div style={{
  height: '3px',
  backgroundColor: '#e5e7eb',
  borderRadius: '2px',
  marginBottom: '32px',
  overflow: 'hidden',
}}>
  <div style={{
    height: '100%',
    width: `${progress}%`,
    backgroundColor: '#1a1560',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  }} />
</div>

{/* Step indicator */}
<p style={{
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9ca3af',
  marginBottom: '10px',
}}>
  {step + 1} of {STEPS.length}
</p>
```

Replace it with:

```tsx
{/* Named step navigator */}
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '4px',
  marginBottom: '32px',
}}>
  {STEP_LABELS.map((label, index) => {
    const isActive = index === step
    const isVisited = index < step
    return (
      <button
        key={label}
        onClick={() => setStep(index as 0 | 1 | 2 | 3)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          height: '3px',
          borderRadius: '2px',
          backgroundColor: isActive ? '#1a1560' : isVisited ? '#9ca3af' : '#e5e7eb',
          marginBottom: '6px',
        }} />
        <span style={{
          fontSize: '11px',
          fontWeight: isActive ? 600 : 500,
          color: isActive ? '#1a1560' : '#9ca3af',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
          display: 'block',
        }}>
          {label}
        </span>
      </button>
    )
  })}
</div>
```

- [ ] **Step 3: Verify in browser**

Navigate to the feed page when `onboarding_complete = false` (or temporarily force the `feedPhase` to `'onboarding'` in `SignalFeed.tsx`). You should see 4 named segments. Clicking "Competitors" while on step 0 should jump to step 2. The "1 of 4" text should be gone.

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && git add components/feed/OnboardingFlow.tsx && git commit -m "feat: replace progress bar with named clickable step segments in feed onboarding"
```

---

## Task 4: Add Signal Feed to admin sidebar

**Files:**
- Modify: `components/shell/sidebar.tsx`

- [ ] **Step 1: Add Signal Feed to adminItems**

Open `components/shell/sidebar.tsx`. Find the `adminItems` array (currently lines 50–58):

```typescript
const adminItems = [
  { label: 'Lenses', href: '/settings/lenses', icon: Layers },
  { label: 'Brand', href: '/settings/brand', icon: Palette },
  { label: 'Publishing', href: '/settings/publishing', icon: Send },
  { label: 'Intelligence', href: '/settings/analytics', icon: BarChart2 },
  { label: 'Schedule', href: '/settings/schedule', icon: CalendarClock },
  { label: 'Billing', href: '/settings/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings/workspace', icon: Settings },
]
```

Replace with:

```typescript
const adminItems = [
  { label: 'Lenses', href: '/settings/lenses', icon: Layers },
  { label: 'Brand', href: '/settings/brand', icon: Palette },
  { label: 'Publishing', href: '/settings/publishing', icon: Send },
  { label: 'Signal Feed', href: '/settings/feed', icon: Rss },
  { label: 'Intelligence', href: '/settings/analytics', icon: BarChart2 },
  { label: 'Schedule', href: '/settings/schedule', icon: CalendarClock },
  { label: 'Billing', href: '/settings/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings/workspace', icon: Settings },
]
```

`Rss` is already imported at the top of the file — no import change needed.

- [ ] **Step 2: Exclude /settings/feed from the Settings catch-all**

Find the `isActive` logic for the admin nav items (currently lines 261–269):

```typescript
const isActive =
  label === 'Settings'
    ? pathname.startsWith('/settings') &&
      !pathname.startsWith('/settings/brand') &&
      !pathname.startsWith('/settings/publishing') &&
      !pathname.startsWith('/settings/schedule') &&
      !pathname.startsWith('/settings/lenses') &&
      !pathname.startsWith('/settings/billing') &&
      !pathname.startsWith('/settings/analytics')
    : pathname === href || pathname.startsWith(href + '/')
```

Replace with:

```typescript
const isActive =
  label === 'Settings'
    ? pathname.startsWith('/settings') &&
      !pathname.startsWith('/settings/brand') &&
      !pathname.startsWith('/settings/publishing') &&
      !pathname.startsWith('/settings/schedule') &&
      !pathname.startsWith('/settings/lenses') &&
      !pathname.startsWith('/settings/billing') &&
      !pathname.startsWith('/settings/analytics') &&
      !pathname.startsWith('/settings/feed')
    : pathname === href || pathname.startsWith(href + '/')
```

- [ ] **Step 3: Verify in browser**

Navigate to any `/settings/*` page. The admin sidebar should show "Signal Feed" between Publishing and Intelligence. Clicking it should 404 for now (page not created yet). The "Settings" item should not highlight when `/settings/feed` is active.

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && git add components/shell/sidebar.tsx && git commit -m "feat: add Signal Feed to admin sidebar"
```

---

## Task 5: Create the Signal Feed settings page

**Files:**
- Create: `app/(dashboard)/settings/feed/page.tsx`

- [ ] **Step 1: Create the page file**

Create `app/(dashboard)/settings/feed/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TopicSelector } from '@/components/feed/TopicSelector'
import { FocusAreaSelector } from '@/components/feed/FocusAreaSelector'
import { CompetitorInput } from '@/components/feed/CompetitorInput'
import { EditorialVoiceSelector } from '@/components/feed/EditorialVoiceSelector'
import { mapVoicesToTone } from '@/lib/feed/toneMapping'

interface FeedSettings {
  brand_name: string
  content_topics: string[]
  services: string[]
  competitors: string[]
  editorial_voices: string[]
}

const EMPTY: FeedSettings = {
  brand_name: '',
  content_topics: [],
  services: [],
  competitors: [],
  editorial_voices: [],
}

export default function FeedSettingsPage() {
  const [settings, setSettings] = useState<FeedSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/feed/settings')
      .then(r => r.ok ? r.json() : null)
      .then((data: FeedSettings | null) => {
        if (data) setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function flash(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        brand_name: settings.brand_name || 'My Brand',
        niche: settings.content_topics.slice(0, 3).join(', '),
        services: settings.services,
        tone_preference: settings.editorial_voices.length > 0
          ? mapVoicesToTone(settings.editorial_voices)
          : 'authoritative',
        competitors: settings.competitors.map(name => ({ name, handle: '', url: '' })),
        content_topics: settings.content_topics,
      }
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        flash('Settings saved.', true)
      } else {
        flash('Failed to save. Please try again.', false)
      }
    } catch {
      flash('Failed to save. Please try again.', false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-8 pb-16">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-zinc-100" />
          <div className="h-4 w-72 rounded bg-zinc-100" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-zinc-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {toast && (
        <div className={cn(
          'fixed right-5 top-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg',
          toast.ok
            ? 'border-zinc-200 bg-white text-zinc-900'
            : 'border-red-100 bg-red-50 text-red-800'
        )}>
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-[Signifier,_Georgia,_serif] text-3xl font-semibold tracking-tight text-zinc-900">
          Signal Feed
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Edit your feed configuration. Changes apply when you save.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Topics
          </p>
          <TopicSelector
            selected={settings.content_topics}
            onChange={content_topics => setSettings(s => ({ ...s, content_topics }))}
          />
        </section>

        <section>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Focus Areas
          </p>
          <FocusAreaSelector
            selected={settings.services}
            onChange={services => setSettings(s => ({ ...s, services }))}
          />
        </section>

        <section>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Competitors
          </p>
          <CompetitorInput
            competitors={settings.competitors}
            onChange={competitors => setSettings(s => ({ ...s, competitors }))}
          />
        </section>

        <section>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Editorial Voice
          </p>
          <EditorialVoiceSelector
            selected={settings.editorial_voices}
            onChange={editorial_voices => setSettings(s => ({ ...s, editorial_voices }))}
          />
        </section>
      </div>

      <div className="mt-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page loads**

Navigate to `/settings/feed`. You should see:
- Page heading "Signal Feed" with the Signifier serif font (matching other admin pages)
- 4 sections: Topics, Focus Areas, Competitors, Editorial Voice
- All 4 selector components rendered and pre-populated with your current settings
- "Save Changes" button at the bottom

If the page shows loading skeleton indefinitely, check the browser network tab — `GET /api/feed/settings` should return 200 with JSON.

- [ ] **Step 3: Verify save works**

Make a change (add or remove a topic), click "Save Changes". You should see a "Settings saved." toast in the top-right corner. Reload the page — the change should persist (loaded from `user_profiles`).

- [ ] **Step 4: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && git add app/\(dashboard\)/settings/feed/page.tsx && git commit -m "feat: add Signal Feed settings page to admin"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Named segments (Topics / Focus Areas / Competitors / Voice) | Task 3 — STEP_LABELS + segment bar |
| Each segment clickable, jumps to that step | Task 3 — onClick on each button |
| Free navigation — any step, any time | Task 3 — no validation gate on click |
| "X of 4" counter removed | Task 3 — removed entirely |
| Signal Feed in admin sidebar | Task 4 — added to adminItems |
| Settings catch-all excludes /settings/feed | Task 4 — exclusion added |
| Single scrollable settings page with 4 sections | Task 5 — page layout |
| Pre-populated from user_profiles on load | Task 2 + Task 5 (fetch on mount) |
| Competitor name flattening on load | Task 2 — route maps `.map(c => c.name)` |
| Competitor re-wrapping on save | Task 5 — `handleSave` maps back to `{name, handle, url}` |
| Editorial voice derived from tone_preference | Task 1 + Task 2 — mapToneToVoices |
| Save button → POST /api/onboarding/complete | Task 5 — handleSave |
| Toast on save success/error | Task 5 — flash() + toast state |
| mapToneToVoices round-trips through mapVoicesToTone | Task 1 — test covers this |

**All spec requirements covered. No gaps.**
