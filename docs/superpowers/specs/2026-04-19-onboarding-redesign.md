# Clout Onboarding Redesign — Design Spec
**Date:** 2026-04-19 (revised for conversion)
**Status:** Approved

---

## Overview

Redesign the onboarding flow from a generic 3-step wizard into a premium, editorial 6-step identity-building experience that ends with immediate value — not an empty dashboard.

**Success metric:** The user finishes onboarding feeling *"This app understands me and already gave me something useful."*

---

## Layout

**Split panel — form left, dark summary right.**

- Left panel: white, contains form content for the current step
- Right panel: fixed `280px`, `bg-zinc-900`, contains the live summary
- On mobile: right panel collapses/hides; single-column form only
- The Clout logo appears top-left of the form panel on every step

---

## Progress Indicator

**Minimal segment bars + step label** — appears at the top of the form panel on every step.

- Six equal-width `2px` horizontal segments, separated by `4px` gaps
- Completed steps: `bg-zinc-900`; remaining: `bg-zinc-200`
- Below the bars: current step name (left, uppercase `text-xs font-medium tracking-wide`) and `"N / 6"` count (right, muted)
- Step switching is an instant DOM swap (no animations beyond `transition-colors` per CLAUDE.md)

---

## Global UX Patterns (all steps)

### Time expectation
Every step shows `"Takes about 2 minutes"` in small muted text below the Clout logo, above the progress bar. Same position every step.

### Why-we-ask copy
Every step shows a short benefit line beneath the subtitle (see per-step copy below). Format: `"We use this to [user benefit]."` — `text-xs text-zinc-400`.

### Skip
- All steps except Step 1 show a quiet `"Skip for now →"` text link below the Continue button
- Clicking it saves whatever data exists and redirects to the interstitial (or dashboard if no generation is possible)
- Step 1 is required (workspace must be created first)

### Reassurance copy
Every step shows beneath the subtitle: *"You can add to or edit this anytime in Settings → Profile."*

### Autosave
- Each step POSTs to `/api/onboarding` on Continue
- Skip also POSTs partial data before redirecting
- API upserts, never inserts (safe to refresh mid-flow)

### Keyboard
- `Enter` advances when current step is valid (text/single-select steps only)
- `Tab` navigates between fields/options

### Back navigation
- Back button on steps 2–6; returns to previous step with no data loss

---

## Steps (revised order)

### Step 1 — Create your workspace *(required)*
**Headline:** Create your workspace
**Subtitle:** Your workspace is where Clout stores your ideas, lenses, drafts, publishing settings, and audience strategy. Use your own name for a personal brand, or a company name for a team account.
**Why-we-ask:** *(not shown — workspace name has no UX benefit to explain)*
**Reassurance:** You can rename it anytime in Settings → Profile.
**No skip link.**

Fields:
- Workspace name (text input, required, placeholder: `"Clout or James Dean"`)

API: `POST /api/onboarding { step: 'workspace', data: { name } }`

---

### Step 2 — Who are you?
**Headline:** Who are you?
**Subtitle:** This is the foundation of every piece of content Clout helps you create.
**Why-we-ask:** We use this to build sharper positioning.
**Reassurance:** You can add to or edit this anytime in Settings → Profile.

Fields:
- Name (text, required, placeholder: `"James Dean"`)
- Profession / Role (text, optional, placeholder: `"e.g. Retail Strategist"`)
- Industry (text, optional, placeholder: `"e.g. Retail, SaaS, Finance"`)
- One-line expertise (text, optional, placeholder: `"e.g. Helping brands understand shopper behavior"`, hint: *"This becomes the core of your positioning."*)

Layout: Name full-width; Profession and Industry side-by-side (2-col on desktop, stacked on mobile); Expertise full-width.

API: `POST /api/onboarding { step: 'identity', data: { display_name, role, industry, expertise } }`
DB: `profiles.display_name`, `profiles.role`, `profiles.industry`, `profiles.expertise`

---

### Step 3 — What are you building for?
**Headline:** What are you building influence for?
**Subtitle:** Choose the direction that best captures your intent.
**Why-we-ask:** We use this to shape your content strategy.
**Reassurance:** You can add to or edit this anytime in Settings → Profile.
**Type:** Single-select radio cards

Options:
- Personal brand
- Company
- Career growth
- Thought leadership
- Something new

API: `POST /api/onboarding { step: 'purpose', data: { purpose } }`
DB: `profiles.purpose`

---

### Step 4 — What do you believe?
**Headline:** What do you believe?
**Subtitle:** Your philosophy creates content nobody else can write.
**Why-we-ask:** We use this to create content nobody else could write.
**Reassurance:** You can add to or edit this anytime in Settings → Profile.

**Primary prompt (required to advance, but can be skipped):**
- "What's one belief or perspective you hold strongly?" (textarea, 3 rows, placeholder: `"e.g. Most brands underestimate the value of physical retail..."`)

**Expandable optional prompts** — shown collapsed behind `"+ Add more context (optional)"` toggle. Expanding reveals:
- Topics that energize you (textarea, 2 rows, placeholder: `"e.g. Consumer psychology, retail design, behavior change..."`)
- Misconceptions you challenge (textarea, 2 rows, placeholder: `"e.g. That e-commerce has killed brick-and-mortar..."`)
- Lessons you repeat often (textarea, 2 rows, placeholder: `"e.g. Invest in fundamentals over chasing trends..."`)

API: `POST /api/onboarding { step: 'beliefs', data: { profile_insights } }`

DB: `profiles.profile_insights` (jsonb), shape:
```json
{
  "core_belief": "",
  "energized_by": "",
  "misconceptions": "",
  "lessons": ""
}
```

---

### Step 5 — Where do you publish?
**Headline:** Where do you publish?
**Subtitle:** Select all that apply.
**Why-we-ask:** We tailor formats and cadence by platform.
**Reassurance:** You can add to or edit this anytime in Settings → Profile.
**Type:** Multi-select pill chips (no max)

Options (v1 only):
- LinkedIn
- X / Twitter
- Newsletter
- Blog
- Instagram
- YouTube
- Internal comms
- Substack

*(TikTok, Threads, Pinterest, Podcast, Speaking — deferred to Settings)*

API: `POST /api/onboarding { step: 'channels', data: { channels: string[] } }`
DB: `profiles.channels` (text[])

---

### Step 6 — Who is your audience?
**Headline:** Who is your audience?
**Subtitle:** Knowing who you're speaking to makes everything sharper.
**Why-we-ask:** This helps make your content resonate.
**Reassurance:** You can add to or edit this anytime in Settings → Profile.
**Type:** Two chip groups

Group 1 — "Who do you want to reach?" (multi-select):
- Executives, Founders, Recruiters, Customers, Creatives, Investors, Industry peers

Group 2 — "What should they think of you?" (multi-select):
- Expert, Trusted, Bold thinker, Helpful, Operator, Creator

**CTA:** "Build my strategy →" (replaces "Continue →" on final step)

API: `POST /api/onboarding { step: 'audience', data: { audience_targets: string[], audience_perception: string[] } }`
DB: `profiles.audience_targets` (text[]), `profiles.audience_perception` (text[])
On submit: does NOT redirect to dashboard — triggers interstitial (see below)

---

## Post-Onboarding Interstitial (critical for activation)

After step 6 submits, do NOT redirect directly to `/dashboard`.

**Route:** `/onboarding/generating` (or a state within the onboarding page)

**Display:**
- Full-width centered layout (no split panel on this screen)
- Animated progress text cycling through: `"Building your positioning…"` → `"Writing your first posts…"` → `"Preparing your strategy…"`
- Progress bar or spinner (subtle, zinc)

**Generation:** Fire a POST to `/api/onboarding/generate` which calls the AI (Anthropic Claude) to produce:
1. **Positioning statement** — 1–2 sentences based on identity + purpose + beliefs
2. **3 tailored post ideas** — brief titles/hooks based on channels + audience + beliefs
3. **1 ready-to-edit draft post** — full text, formatted for their primary channel

**Results screen** (shown once generation completes):
- Section: "Your positioning" — displays the positioning statement
- Section: "Post ideas to get you started" — 3 cards with hook text and channel tag
- Section: "Your first draft" — full post text in an editable textarea, pre-filled
- CTA: "Enter dashboard →" → redirects to `/dashboard`
- Secondary: "Skip, take me to dashboard" (quiet link)

**If generation fails or takes >10s:** skip silently to dashboard with a toast: `"We're still building your strategy — check back in a moment."`

---

## Dashboard Entry State (first visit)

After onboarding, the first dashboard visit should not feel empty. The dashboard layout should detect `onboarding_completed_at` and if this is the first visit, show a welcome banner:

- "Welcome, [name]. Here's where we start."
- Quick-action: "Capture your first idea"
- If generation completed: surface the generated draft under "Your first draft — ready to edit"
- "This week's visibility plan" (can be a placeholder card for v1 that says "Complete your profile to unlock your plan")

The welcome banner dismisses after first interaction.

---

## Live Summary Panel (desktop only)

The right panel (`bg-zinc-900`) builds in real-time as the user advances.

### Profile card (top)

- Avatar: initials circle, `bg-zinc-700 text-zinc-100`
- Workspace name
- Role / profession line (fills in at step 2)
- Tags: filled chips (`bg-zinc-700 text-zinc-100`) for confirmed data, dashed-outline chips (`text-zinc-600 border-dashed border-zinc-700`) for pending fields

### Strategy brief (below divider)

- Section label: `"Strategy brief"` (uppercase, `text-zinc-500`)
- Auto-generated sentence combining confirmed answers:
  > *"You're building a [purpose] as a [role]. Your focus: [channels]. Speaking to [audience] — they should see you as [perception]."*
- Falls back while fields are empty: *"Complete each step to see your tailored strategy."*
- Updates on every state change (client-side string interpolation, no API calls)

---

## Removed from Onboarding (moved to Settings)

- **Voice** — Settings → Profile → Writing style
- **First win** — Dashboard onboarding checklist / first-run prompt
- **Growth focus** (visibility/consistency/authority etc.) — deferred entirely

---

## Data Model

### New columns on `profiles`

```sql
purpose              text
role                 text
industry             text
expertise            text
profile_insights     jsonb   -- { core_belief, energized_by, misconceptions, lessons }
channels             text[]
audience_targets     text[]
audience_perception  text[]
onboarding_completed_at timestamptz
```

Existing columns unchanged: `display_name`, `bio`, `operator_visible`.

### New table: `onboarding_generations`

```sql
create table onboarding_generations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  created_at    timestamptz default now(),
  positioning   text,
  post_ideas    jsonb,   -- array of { hook, channel }
  draft_post    text,
  status        text default 'pending'  -- pending | complete | failed
);
```

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding` | POST | Handles all 6 steps (step param routing) |
| `/api/onboarding/generate` | POST | Fires AI generation after step 6 |

### `/api/onboarding` step handlers

New step values: `workspace`, `identity`, `purpose`, `beliefs`, `channels`, `audience`
Old step values (`profile`, `privacy`) remain for backwards compatibility, not called during new onboarding.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/(auth)/onboarding/page.tsx` | Full replacement — 6-step wizard + interstitial state |
| `app/api/onboarding/route.ts` | Add new step handlers |
| `app/api/onboarding/generate/route.ts` | New — AI generation endpoint |
| `supabase/schema.sql` | Add new profile columns + `onboarding_generations` table |
| `types/db.ts` | Regenerate after schema changes |
| `app/(dashboard)/layout.tsx` or dashboard page | Welcome banner for first-visit state |

---

## Verification

1. All 6 steps complete → interstitial shows → generation runs → results displayed → "Enter dashboard" works
2. Skip on step 2 → saves partial data → routes to interstitial or dashboard
3. Skip on step 4 (primary belief empty) → works, empty `profile_insights`
4. Back navigation → no data loss on any step
5. Refresh mid-onboarding → saved data persists (upsert pattern)
6. Mobile viewport → right panel hidden, single column, all fields accessible
7. Generation failure → silent fallback to dashboard with toast
8. All new `profiles` columns populated after full completion
9. `onboarding_generations` row created and status=complete after generation
10. Dashboard welcome banner appears on first post-onboarding visit
11. `Enter` key advances on text/single-select steps; no accidental submit on chip steps
