# Create Hub — Design Spec

**Date:** 2026-05-06
**Branch:** feat/framework-lens
**Status:** Approved for implementation

---

## Context

Clout is evolving from a social post generator into a broader content operating system. The "Create" section establishes the core creation layer — a modular hub where users can generate different types of content (long-form, social, editorial) from a single surface. This is a navigation + routing + UI foundation task; content generators are built separately.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Sidebar position | Between Capture and Studio | Tells the workflow story: capture ideas → create formats → refine in studio |
| Sidebar icon | `Sparkles` (lucide) | PenSquare is already used by Studio; Sparkles signals AI-native creation |
| Card layout | Featured active + coming soon grid | Active types get full-width prominence; coming soon stays visible but secondary; scales as types activate |
| Registry pattern | `lib/content/contentTypes.ts` | Single source of truth; Create page renders dynamically; future additions are trivial |

---

## Architecture

### Content Type Registry

`lib/content/contentTypes.ts` — single source of truth for all content types.

```ts
import type { LucideIcon } from 'lucide-react'
import { FileText, MessageSquare, Mail } from 'lucide-react'

export type ContentTypeStatus =
  | 'active'
  | 'coming_soon'
  | 'beta'
  | 'experimental'
  | 'internal'

export interface ContentType {
  id: string
  title: string
  description: string
  ctaLabel?: string       // action label for active/beta/experimental types
  statusLabel?: string    // muted badge text for non-active types (not a button)
  route?: string          // undefined = not yet routed
  status: ContentTypeStatus
  icon: LucideIcon
}

export const CONTENT_TYPES: ContentType[] = [
  {
    id: 'blog',
    title: 'Blog Post',
    description: 'Generate SEO-ready long-form content with titles, metadata, structure, and AI-assisted writing workflows.',
    ctaLabel: 'Create Blog Post',
    route: '/create/blog',
    status: 'active',
    icon: FileText,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Post',
    description: 'Create professional thought leadership content optimized for reach, credibility, and engagement.',
    statusLabel: 'Coming Soon',
    status: 'coming_soon',
    icon: MessageSquare,
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    description: 'Build editorial newsletters with recurring formats, curated sections, and audience-first structure.',
    statusLabel: 'Coming Soon',
    status: 'coming_soon',
    icon: Mail,
  },
]
```

`statusLabel` renders as a muted pill/badge — never as a button. Buttons imply affordance. Non-interactive states communicate availability, not action.

Adding a new content type in the future = one object added to this array. No page edits required.

---

## Routes

| Route | File | Purpose |
|---|---|---|
| `/create` | `app/(dashboard)/create/page.tsx` | Hub page — renders from registry |
| `/create/blog` | `app/(dashboard)/create/blog/page.tsx` | Blog shell — placeholder sections |

Both live under the existing `(dashboard)` route group. Auth wrapping is inherited automatically from `app/(dashboard)/layout.tsx`.

---

## Components

### `lib/content/contentTypes.ts`
Registry. No UI. Pure data + types.

### `components/create/CreateCard.tsx`
Single card component. Props: `ContentType`. Handles both active and coming-soon states internally:
- **Active:** white background, dark CTA button, hover ring, wraps in `<Link href={route}>`
- **Coming soon:** muted background, opacity-60, "Coming Soon" badge, non-interactive (`<div>` not `<Link>`)

### `app/(dashboard)/create/page.tsx`
Hub page. Renders from `CONTENT_TYPES`:
- Active types → full-width featured row (top section, filtered by `status === 'active'`)
- Coming soon types → 2-column grid below (filtered by `status === 'coming_soon'`)

Copy:
- Headline: "Create Content" (Signifier serif)
- Subheadline: "Generate platform-native content, long-form writing, and editorial assets from a single workflow."

### `app/(dashboard)/create/blog/page.tsx`
Blog shell. No generator logic. Contains:
- Heading: "Blog Post Creation"
- Subheadline: "Create SEO-ready long-form content with metadata, structure, imagery, and AI-assisted drafting workflows."
- 6 placeholder section cards: Primary Keyword, Meta Title, Meta Description, Content Structure, Images, Draft Generation
- Each card is visual only — no interaction

---

## Sidebar Change

**File:** `components/shell/sidebar.tsx`

Add `Create` to `navItems` between `Capture` and `Studio`:

```ts
import { Sparkles } from 'lucide-react'

// In navItems array, between Capture and Studio:
{ label: 'Create', href: '/create', icon: Sparkles },
```

Active state detection uses the existing `pathname === href || pathname.startsWith(href + '/')` logic, so `/create/blog` correctly highlights the Create nav item.

---

## Visual Design

Follows the existing design system (OKLCH tokens, Geist Sans, Tailwind v4, shadcn primitives):

**Active card:**
- `border border-zinc-200 bg-white rounded-lg p-5`
- Full-width layout (icon + text + CTA in a row)
- Dark CTA button: `bg-zinc-900 text-white text-sm px-4 py-2 rounded-md`
- Hover: `hover:ring-1 hover:ring-zinc-300 transition-all`

**Coming soon card:**
- `border border-zinc-100 bg-zinc-50 rounded-lg p-4 opacity-60`
- Muted text, no link, `cursor-default`
- Status pill (not a button): `text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full` — communicates availability, not action

**Blog shell placeholder cards:**
- `border border-zinc-100 bg-zinc-50 rounded-lg p-6`
- Centered icon (lucide) + label text
- 3-column grid, non-interactive

**Page layout:**
- `max-w-4xl mx-auto px-8 py-10`
- Section heading with `font-[Signifier]` or equivalent serif class from existing token system

---

## File List

```
lib/content/contentTypes.ts               ← new
components/create/CreateCard.tsx          ← new
app/(dashboard)/create/page.tsx           ← new
app/(dashboard)/create/blog/page.tsx      ← new
components/shell/sidebar.tsx              ← modify (add 1 nav item + Sparkles import)
```

No layout files need modification. No API routes needed. No database changes.

---

## Future Evolution

The registry is designed to eventually carry more than routing. As Clout matures, `ContentType` will naturally expand to support:

- `requiredPlan` — gating by subscription tier
- `modalities` — text, voice, upload, assistant
- `lensIds` — compatible lenses
- `templateIds` — starter templates
- `schedulable: boolean` — queue support
- `analyticsKey` — platform-specific metrics

The `/create` page itself will evolve from a static catalog into an operational workspace:

- **Continue Working** — resume in-progress drafts
- **Recent Drafts** — last N outputs per content type
- **In Progress** — drafts pending review or publish

This transforms Create from capability discovery into the actual creation environment. The current implementation lays the structural foundation for all of this without over-building now.

---

## Verification

1. `npm run dev` — start dev server
2. Navigate to `/create` — hub renders with Blog Post (active, full-width) + LinkedIn/Newsletter (coming soon, 2-col grid)
3. Click "Create Blog Post" — routes to `/create/blog`, shows placeholder shell with 6 section cards
4. Navigate away and back — sidebar highlights Create for both `/create` and `/create/blog`
5. Click a coming soon card — nothing happens (no link, not interactive)
6. Resize to mobile width — page is responsive, cards stack vertically
7. `npm run build` — zero TypeScript errors
