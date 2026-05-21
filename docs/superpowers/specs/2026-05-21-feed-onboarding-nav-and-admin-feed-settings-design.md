# Feed Onboarding Nav + Admin Signal Feed Settings

**Date:** 2026-05-21  
**Status:** Approved

---

## Overview

Two related improvements to the Signal Feed experience:

1. **Named, clickable step navigation** in the feed onboarding flow — users can jump to any step at any time
2. **Signal Feed settings page** in the Admin tab — users can view and edit their feed configuration after onboarding completes

---

## Part 1 — Onboarding Step Navigator

### Current State

`components/feed/OnboardingFlow.tsx` renders:
- A single thin progress bar (fills left-to-right as steps advance)
- A plain "X of 4" text counter below it
- No step labels, no clickable navigation

### Desired State

Replace the progress bar + counter with a **named segment bar** — 4 labeled segments, each independently clickable.

### Visual Specification

```
[■ Topics]  [─ Focus Areas]  [─ Competitors]  [─ Voice]
```

Each segment consists of:
- A thin horizontal bar (same height as the existing progress bar, ~3px)
- A label below the bar in small uppercase tracking text (10–11px)

**State styles:**

| State    | Bar color       | Label color     | Label weight |
|----------|-----------------|-----------------|--------------|
| Active   | `#1a1560` navy  | `#1a1560` navy  | 600 (bold)   |
| Visited  | `#9ca3af` gray  | `#9ca3af` gray  | 500          |
| Future   | `#e5e7eb` light | `#9ca3af` gray  | 500          |

All 4 segments are clickable at all times — clicking jumps directly to that step with no validation gate. A visited step is any step with index < current step; a future step is any step with index > current step.

### Step Labels

| Step index | Label        |
|------------|-------------|
| 0          | Topics       |
| 1          | Focus Areas  |
| 2          | Competitors  |
| 3          | Voice        |

### What Does Not Change

- Step content components (`TopicSelector`, `FocusAreaSelector`, `CompetitorInput`, `EditorialVoiceSelector`)
- Step headlines and subheadlines in `STEPS` array
- Back / Continue / Skip buttons and their layout
- Validation (`isValid`) — Continue button still disabled when invalid, but navigation via segment bar is always free
- `handleComplete` and `handleOnboardingComplete` flow

### Implementation Notes

- The "X of 4" text counter is removed entirely; the named segments replace both the bar and the counter
- Segment bar is implemented inline in `OnboardingFlow.tsx` — no new component needed
- Use a CSS grid with `grid-template-columns: repeat(4, 1fr)` and `gap: 4px` for even spacing
- `onClick` on each segment calls `setStep(index as 0 | 1 | 2 | 3)`

---

## Part 2 — Admin Signal Feed Settings Page

### Current State

The Admin sidebar (`components/shell/sidebar.tsx`) contains: Lenses, Brand, Publishing, Intelligence, Schedule, Billing, Settings. No feed configuration is accessible after onboarding.

### Desired State

Add a **Signal Feed** entry to the Admin sidebar. Clicking it opens a new settings page where users can view and edit the 4 feed configuration sections on a single scrollable page.

### Sidebar Change

In `adminItems` array in `sidebar.tsx`, add after Publishing:

```ts
{ label: 'Signal Feed', href: '/settings/feed', icon: Rss }
```

`Rss` is already imported in `sidebar.tsx`.

The active-state logic for the "Settings" catch-all item must also exclude `/settings/feed`.

### New Page: `/settings/feed/page.tsx`

**Route:** `app/(dashboard)/settings/feed/page.tsx`  
**Auth:** Session-gated (same pattern as other settings pages)  
**Client component:** Yes (`'use client'`)

#### Layout

Standard Admin page layout matching other settings pages:

```
<h1>Signal Feed</h1>
<p>Edit your feed configuration. Changes apply when you save.</p>

── Topics ──────────────────────────────
<TopicSelector selected={...} onChange={...} />

── Focus Areas ─────────────────────────
<FocusAreaSelector selected={...} onChange={...} />

── Competitors ─────────────────────────
<CompetitorInput competitors={...} onChange={...} />

── Editorial Voice ──────────────────────
<EditorialVoiceSelector selected={...} onChange={...} />

[Save Changes]   (or saved toast on success)
```

Each section has a small uppercase label heading (matching the style of other admin settings sections) and the existing selector component rendered inline.

#### Data Flow

**Load (on mount):**
- Fetch `GET /api/feed/settings` — a new thin route that reads `user_profiles` for the current user and returns:
  ```json
  {
    "content_topics": [...],
    "services": [...],
    "competitors": [...],
    "editorial_voices": [...],
    "brand_name": "..."
  }
  ```
- Note: `editorial_voices` is not currently stored in `user_profiles` (only `tone_preference` is). The new GET route derives editorial voices from `tone_preference` using the inverse of `mapVoicesToTone`. If no mapping exists, returns `[]`.

**Save:**
- User clicks "Save Changes" button
- `POST /api/onboarding/complete` with the full `OnboardingPayload` (existing endpoint, existing upsert logic)
- On success: show a brief toast ("Settings saved") — no page reload needed
- On error: show error toast

#### Data Shape Notes

`CompetitorInput` takes `string[]` (names only), but `user_profiles.competitors` is stored as `Array<{ name: string; handle: string; url: string }>`. The settings page must:
- **Load:** map `competitors.map(c => c.name)` before passing to `CompetitorInput`
- **Save:** map back to `competitors.map(name => ({ name, handle: '', url: '' }))` before calling the save endpoint

#### New API Route: `GET /api/feed/settings`

`app/api/feed/settings/route.ts`

- Auth-gated via `getSession()`
- Reads `user_profiles` row for `session.userId`
- Returns:
  ```json
  {
    "brand_name": "...",
    "content_topics": [...],
    "services": [...],
    "competitors": ["name1", "name2"],
    "editorial_voices": ["Analytical", "Contrarian"]
  }
  ```
- `competitors` is already flattened to `string[]` (names only) — the route does the `.map(c => c.name)` transform
- `editorial_voices` is derived from `tone_preference` via `mapToneToVoices`
- If no profile exists yet, returns empty arrays

#### Reused Components

All 4 selector components are reused as-is:
- `components/feed/TopicSelector.tsx`
- `components/feed/FocusAreaSelector.tsx`
- `components/feed/CompetitorInput.tsx`
- `components/feed/EditorialVoiceSelector.tsx`

These components are currently designed to be self-contained with `selected` + `onChange` props — they work identically in a settings page context.

#### Editorial Voice ↔ tone_preference Mapping

`mapVoicesToTone` in `lib/feed/toneMapping.ts` converts an array of voice strings → a single `TonePreference`. The settings page needs the inverse to pre-populate the voice selector from the stored `tone_preference`. Add a `mapToneToVoices(tone: TonePreference): string[]` function to `toneMapping.ts`.

---

## Files Changed

| File | Change |
|------|--------|
| `components/feed/OnboardingFlow.tsx` | Replace progress bar + counter with named segment bar |
| `components/shell/sidebar.tsx` | Add Signal Feed to `adminItems`; update Settings active-state exclusion |
| `app/(dashboard)/settings/feed/page.tsx` | New — Signal Feed settings page |
| `app/api/feed/settings/route.ts` | New — GET user feed settings |
| `lib/feed/toneMapping.ts` | Add `mapToneToVoices` inverse function |

---

## Out of Scope

- Auto-save / optimistic updates (explicit save button only)
- Triggering a feed refresh after saving (future work)
- Migrating existing `editorial_voices` storage — the tone mapping approximation is acceptable for now
