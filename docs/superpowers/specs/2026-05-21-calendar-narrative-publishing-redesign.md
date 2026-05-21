# Calendar, Narrative Flow & Publishing Redesign

**Date:** 2026-05-21  
**Branch:** feature/editorial-intelligence  
**Status:** Approved — ready for implementation

---

## Context

Clout is repositioning from "AI content generation tool" to "narrative operations infrastructure." The existing publishing UI (inbox, queue, studio) communicates "scheduled ideas." It needs to communicate "strategic narrative operations."

This redesign replaces the existing inbox, queue, and studio pages entirely with a new Calendar experience and Narrative Flow view — building the visual intelligence layer that makes Clout feel like a Bloomberg Terminal for thought leadership rather than a social scheduler.

---

## Scope

Three systems, implemented as a cohesive whole:

1. **Calendar view** — replaces `/queue` and `/inbox`
2. **Platform-native post preview** — replaces `/studio/[id]`
3. **Narrative Flow view** — new toggle mode within the calendar

---

## Core Design Decisions

### 1. Full Replacement
The existing inbox, queue, and studio pages are deprecated. The new calendar at `/calendar` becomes the primary publishing interface. Studio redirects to the new post editor.

### 2. AI-Inferred Narrative Labels
Narratives and arcs are not user-managed. Clout labels each post's narrative role automatically during generation. No new "campaign" or "narrative" table is required — narrative metadata lives on the `outputs` table as new fields.

### 3. Concept → Posts Model
Every calendar event represents a **concept** (one idea), not a single post. Each concept spawns multiple platform-specific posts. The UI makes this explicit: "5 concepts · 14 posts."

---

## Information Architecture

### New Route: `/calendar`
Replaces `/inbox` and `/queue`. Two views toggled in the toolbar:
- **Grid** (default) — week-by-time-slot calendar
- **Narrative** — arc swim lanes with strategic metadata

### Deprecated Routes
- `/inbox` → redirect to `/calendar`
- `/queue` → redirect to `/calendar`

### Updated Route: `/studio/[id]`
Becomes the platform-native preview workspace (see Post Editor section below).

---

## Calendar Page

### Intelligence Bar
Persistent scrolling bar at the top of every calendar page. Shows live AI-computed signals:
- **Danger** (red): Missing narrative types (e.g., "No founder voice in 8 days")
- **Warning** (amber): Imbalance alerts (e.g., "Conversion content — 0 posts in 12 days")
- **Positive** (green): Performing well (e.g., "Authority posts outperforming tactical by 31%")

Signals are computed server-side from `outputs` history + `user_signal_interactions`.

### Toolbar
- Week navigator (prev/next)
- Week label + subtitle ("5 concepts · 14 posts · Narrative health 74%")
- Grid / Narrative view toggle

### Grid View (Default)

**Day headers** show two lines:
1. Day name + date
2. Strategic intent label (e.g., "Mon: Conversation · Tension", "Fri: Founder Narrative")
  - Intent labels are AI-suggested based on historical performance per day-of-week
  - Editable per workspace in scheduling settings

**Time slots**: 7am, 9am, 12pm, 2pm, 5pm (configurable). Empty slots render as subtle white cells.

**Concept Cards** — card hierarchy from top to bottom:

1. **Goal badge** — most prominent colored label (AUTHORITY, CONVERSATION, LEADS, LOYALTY, EDUCATION, SUBSCRIBERS, POSITIONING, RETENTION)
2. **Headline** — largest, darkest text (font-weight 800, color #09090b)
3. **Role + Lens tags** — secondary metadata (Contrarian, Framework, Evidence, CTA, Tension, Founder; lens tags from the generation)
4. **Divider**
5. **Platform variants strip** — horizontally scrollable pills, one per platform post

**Platform variant pills** show:
- Platform logo (LinkedIn `in`, X mark SVG, Threads SVG, Instagram gradient, Facebook `f`, TikTok, Newsletter envelope, YouTube play)
- Profile handle/name (e.g., "Lauren Proctor", "@laurenproctor", "Clout HQ (Page)")
- Status badge: Approved (green), Queued (purple), Draft (gray)
- Overflow indicator (+N) when more posts exist than visible width allows

**Semantic goal colors:**
| Goal | Background | Border/Accent | Text |
|------|-----------|---------------|------|
| Authority | #eff6ff | #3b82f6 | #1d4ed8 |
| Conversation | #fffbeb | #f59e0b | #b45309 |
| Leads | #f0fdf4 | #22c55e | #15803d |
| Loyalty | #f5f3ff | #a78bfa | #6d28d9 |
| Education | #ecfeff | #22d3ee | #0e7490 |
| Subscribers | #fff1f2 | #fb7185 | #9f1239 |
| Positioning | #eef2ff | #818cf8 | #3730a3 |
| Retention | #fdf4ff | #c084fc | #7e22ce |

**Causality arrows** — a subtle `→` indicator on cards that belong to a narrative sequence (same arc, adjacent funnel steps). Shown at top-right of the card.

**Card click** → opens Detail Panel (right sidebar, 296px).

### Detail Panel (right sidebar)

Populated on card click. Sections:
1. **Concept** — headline, goal, role, funnel stage, resonance, audience
2. **Platform Posts** — each post as a clickable row: logo + platform name + handle + status. Clicking opens the post editor for that specific platform variant.
3. **Publishing Rationale** — three AI-generated fields: "Why this concept exists", "Expected outcome", "Narrative dependency"
4. **Actions** — "Publish All →", "Edit Concept", rewrite shortcuts

### Narrative View

**Narrative Health panel** (top of view):
- Score out of 100 (e.g., "74%")
- Strengths column (green checkmarks)
- Gaps column (red × marks)

**Arc blocks** — each narrative arc renders as a structured block:

1. **Arc header** — label ("Strategic Arc"), arc name (colored per goal type), description, status badges (Active, Resonance, Stage, Platforms), stats (Concepts count, Posts count, Running weeks)
2. **Funnel progress bar** — horizontal step indicators showing Problem → Reframe → Evidence → Framework → CTA (or custom arc steps). Done steps are gray, active step glows indigo.
3. **Concept cards** — horizontally scrollable within the arc. Same card design as grid, but fixed 220px width. Includes platform variants strip.
4. **Suggested next post** — when an arc is missing a funnel step, show a ghost card with a "Generate →" button.
5. **+ Add to arc** — dashed add card at the end.

---

## Post Editor (Platform-Native Preview)

Route: `/studio/[id]`

Replaces the current dark-themed single-channel editor. The new editor is a focused workspace with:

**Left panel — Editor:**
- Concept headline + body for the selected platform variant
- Platform selector tabs at top (one tab per connected platform post)
- Character count enforcement per platform
- Lens tags shown as read-only context
- AI rewrite shortcuts (Sharpen, Expand, Make Contrarian, etc.)
- Autosave (existing `use-autosave` hook reused)

**Right panel — Platform Preview:**
- Realistic rendering of how the post will appear on the selected platform
- LinkedIn: card with profile photo, name, connection badge, post body, reaction bar
- X: tweet with handle, post body, reply/retweet/like bar, character indicator
- Threads: minimal card with avatar, handle, body
- Newsletter: editorial layout with subject line + body
- Instagram: square image placeholder + caption

**Bottom bar:**
- Status (Draft / Approved / Queued / Published)
- Platform distribution summary ("Going to 3 platforms")
- Publish / Schedule / Save actions

---

## Data Model Changes

New fields on `outputs` table:

```sql
ALTER TABLE outputs ADD COLUMN narrative_role text;        -- 'contrarian' | 'framework' | 'evidence' | 'cta' | 'tension' | 'founder' | null
ALTER TABLE outputs ADD COLUMN narrative_arc_id uuid;      -- groups related outputs into an arc (AI-assigned, nullable)
ALTER TABLE outputs ADD COLUMN narrative_arc_name text;    -- human-readable arc label (AI-assigned)
ALTER TABLE outputs ADD COLUMN goal text;                  -- 'authority' | 'conversation' | 'leads' | 'loyalty' | 'education' | 'subscribers' | 'positioning' | 'retention' | null
ALTER TABLE outputs ADD COLUMN funnel_stage text;          -- 'top' | 'awareness' | 'trust' | 'consideration' | 'conversion' | 'retention'
ALTER TABLE outputs ADD COLUMN resonance_prediction text;  -- 'high' | 'medium' | 'low' (AI-computed at generation time)
ALTER TABLE outputs ADD COLUMN concept_id uuid;            -- groups platform variants of the same concept
```

New field on `outputs` to support the concept model: `concept_id` groups all platform variants of a single idea. The calendar grid shows one card per unique `concept_id`. In practice, `concept_id` can be backfilled from the existing `generationGroupId` field where present — new outputs set both fields to the same UUID at generation time. `generationGroupId` is retained for backwards compatibility.

**API additions:**
- `GET /api/calendar?week=2026-05-13` — returns concepts with their platform variants grouped by `concept_id`, keyed by scheduled day/time
- `GET /api/narrative-health` — returns health score + strengths + gaps
- `GET /api/narrative-arcs?week=2026-05-13` — returns arc groupings with funnel progress
- `PATCH /api/outputs/[id]/narrative` — update narrative_role, goal, arc assignment

---

## State Management

Calendar page uses local `useState` consistent with existing patterns — no Zustand. Key state:
- `selectedConceptId` — drives detail panel
- `viewMode: 'grid' | 'narrative'`
- `weekStart` — ISO date string
- `concepts` — fetched on mount + week change
- `intelligenceSignals` — fetched on mount

---

## Component Hierarchy

```
/app/(dashboard)/calendar/
  page.tsx                        ← main calendar page

/components/calendar/
  CalendarPage.tsx                ← layout shell
  IntelligenceBar.tsx             ← scrolling signal warnings
  CalendarToolbar.tsx             ← week nav + view toggle
  GridView.tsx                    ← week-by-time grid
    DayHeader.tsx                 ← day name + strategic intent
    TimeSlot.tsx                  ← single time row
    ConceptCard.tsx               ← the main card (goal + headline + tags + platform strip)
    PlatformVariantStrip.tsx      ← scrollable platform pills
    PlatformPill.tsx              ← individual platform + handle + status
    CausalityArrow.tsx            ← sequence connector
  NarrativeView.tsx               ← arc swim lanes
    NarrativeHealthPanel.tsx      ← health score + gaps/strengths
    ArcBlock.tsx                  ← arc header + funnel + posts
    ArcHeader.tsx                 ← strategic initiative header
    FunnelProgress.tsx            ← step indicator bar
    SuggestedPostCard.tsx         ← ghost card for missing arc steps
  DetailPanel.tsx                 ← right sidebar
    PlatformPostRow.tsx           ← clickable platform variant row

/components/platform-icons/
  PlatformIcon.tsx                ← returns correct SVG logo per platform string
  index.ts

/app/(dashboard)/studio/[id]/
  page.tsx                        ← updated platform-native editor

/components/studio/
  PlatformTabs.tsx                ← tab bar per connected platform variant
  PlatformPreview.tsx             ← realistic rendering switcher
  previews/
    LinkedInPreview.tsx
    XPreview.tsx
    ThreadsPreview.tsx
    NewsletterPreview.tsx
    InstagramPreview.tsx
```

---

## Reused Existing Code

- `hooks/use-autosave.ts` — reused as-is in new studio editor
- `hooks/use-key.ts` — keyboard shortcuts (J/K navigation, Cmd+S save)
- `lib/publishing/` — unchanged, all publishing logic stays
- `components/ui/*` — all shadcn primitives reused
- `/types/domain.ts` `Output`, `Channel`, `SchedulingPreferences` — extended, not replaced
- `app/api/outputs/[id]/route.ts` — extended with new narrative fields
- `app/api/scheduling/route.ts` — unchanged

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `J` / `K` | Navigate between concepts |
| `→` / `←` | Navigate weeks |
| `N` | Toggle Narrative / Grid view |
| `E` | Open selected concept in editor |
| `Space` | Approve selected concept |
| `Cmd+Enter` | Publish all approved posts for concept |

---

## Empty States

- **Empty week** — "No concepts scheduled. Generate from signals or create manually." + CTA buttons
- **Empty arc** — "No posts in this arc yet. Add a concept or let Clout suggest the next step."
- **No platform connections** — "Connect a platform in Settings to start scheduling."

---

## Loading / Skeleton States

- Calendar grid: skeleton cards per recent week's post density
- Detail panel: stacked skeleton lines matching content layout
- Narrative view: skeleton arc blocks with shimmer headers

---

## Mobile Behavior

- Grid view collapses to single-day view with day selector strip at top
- Narrative view scrolls vertically with arc blocks stacked
- Detail panel becomes a bottom sheet (slides up from bottom of screen)
- Platform variant pills remain horizontally scrollable within cards

---

## Implementation Order (Highest Leverage First)

1. **Database migration** — add `concept_id`, `narrative_role`, `goal`, `narrative_arc_id`, `resonance_prediction` to `outputs`
2. **`PlatformIcon` component** — reusable SVG logos, needed by everything
3. **`/api/calendar` endpoint** — core data shape for calendar page
4. **`ConceptCard` + `PlatformVariantStrip`** — the primary visual unit
5. **`GridView`** — assemble cards into time grid
6. **`DetailPanel`** — right sidebar with platform posts list
7. **`IntelligenceBar`** — warnings computed from outputs history
8. **`/calendar` page** — wire toolbar, grid, detail panel, week navigation
9. **`NarrativeHealthPanel` + `ArcBlock`** — narrative view components
10. **`NarrativeView`** — assemble arc swim lanes
11. **Platform-native post editor** — update `/studio/[id]` with platform tabs + previews
12. **Redirect `/inbox` and `/queue`** — deprecate old pages

---

## Design System Note

`docs/CLAUDE.md` currently specifies "Zinc color palette only, no custom colors." This redesign intentionally supersedes that constraint. The semantic goal colors (authority blue, conversation amber, leads green, etc.) are load-bearing — they encode strategic meaning and are core to the "narrative operations" positioning.

**Required update during implementation:** Remove or amend the "Zinc color palette only" rule in `docs/CLAUDE.md` to allow semantic goal colors. The zinc palette continues to apply to chrome (backgrounds, borders, text, icons) — the only additions are the goal color swatches defined in the Semantic goal colors table above.

---

## Verification

- Calendar loads with correct concepts grouped by `concept_id`
- Platform pills show correct logo, handle, and status for each connected channel
- Clicking a concept opens detail panel with all platform variants listed
- "Publish All" triggers existing publishing flow for each approved variant
- Narrative view shows correct arc groupings and funnel progress
- Intelligence bar surfaces real warnings from outputs history
- Narrative Health score computes from actual posting patterns
- Redirects from `/inbox` and `/queue` work correctly
- Mobile: single-day view renders, detail panel opens as bottom sheet
- Keyboard shortcuts navigate and trigger actions
