# Create Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Create" section to the sidebar and a scalable content creation hub at `/create`, with a Blog Post route shell at `/create/blog`, driven by a content type registry.

**Architecture:** A single `contentTypes.ts` registry drives the Create hub page dynamically — active types render as full-width featured cards, coming-soon types render as a muted 2-col grid with a status pill (not a button). A single `CreateCard` component handles both states. The `/create/blog` route is a visual placeholder shell with 6 section cards; no generator logic is built yet.

**Tech Stack:** Next.js App Router (grouped `(dashboard)` routes), TypeScript, Tailwind CSS v4, lucide-react, existing shadcn primitives. No new dependencies.

> **Note on testing:** This project has no test infrastructure. Verification uses `npx tsc --noEmit` (type checking) and `npm run build` (full compile) as correctness gates. Each task ends with a TypeScript check. A full build check runs at the end.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/content/contentTypes.ts` | Registry — types + data, no UI |
| Create | `components/create/CreateCard.tsx` | Single card, handles active + coming-soon states |
| Create | `app/(dashboard)/create/page.tsx` | Hub page — renders from registry |
| Create | `app/(dashboard)/create/blog/page.tsx` | Blog shell — 6 placeholder section cards |
| Modify | `components/shell/sidebar.tsx` | Add Create nav item between Capture and Studio |

---

## Task 1: Content Type Registry

**Files:**
- Create: `lib/content/contentTypes.ts`

- [ ] **Step 1: Create the registry file**

```ts
// lib/content/contentTypes.ts
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
  /** Action label — only defined for active/beta/experimental types */
  ctaLabel?: string
  /** Availability label rendered as a muted pill — never a button */
  statusLabel?: string
  /** Destination route — undefined means not yet routed */
  route?: string
  status: ContentTypeStatus
  icon: LucideIcon
}

export const CONTENT_TYPES: ContentType[] = [
  {
    id: 'blog',
    title: 'Blog Post',
    description:
      'Generate SEO-ready long-form content with titles, metadata, structure, and AI-assisted writing workflows.',
    ctaLabel: 'Create Blog Post',
    route: '/create/blog',
    status: 'active',
    icon: FileText,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Post',
    description:
      'Create professional thought leadership content optimized for reach, credibility, and engagement.',
    statusLabel: 'Coming Soon',
    status: 'coming_soon',
    icon: MessageSquare,
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    description:
      'Build editorial newsletters with recurring formats, curated sections, and audience-first structure.',
    statusLabel: 'Coming Soon',
    status: 'coming_soon',
    icon: Mail,
  },
]

export const activeTypes = CONTENT_TYPES.filter((t) => t.status === 'active')
export const comingSoonTypes = CONTENT_TYPES.filter((t) => t.status === 'coming_soon')
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit
```

Expected: no errors related to `lib/content/contentTypes.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/content/contentTypes.ts
git commit -m "feat(create): add content type registry"
```

---

## Task 2: CreateCard Component

**Files:**
- Create: `components/create/CreateCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/create/CreateCard.tsx
'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/lib/content/contentTypes'

interface CreateCardProps {
  type: ContentType
  /** 'featured' = full-width active layout; 'grid' = compact coming-soon layout */
  variant: 'featured' | 'grid'
}

export function CreateCard({ type, variant }: CreateCardProps) {
  const Icon = type.icon
  const isActive = type.status === 'active'

  const cardContent = (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isActive
          ? 'border-zinc-200 bg-white hover:ring-1 hover:ring-zinc-300'
          : 'cursor-default border-zinc-100 bg-zinc-50 opacity-60',
        variant === 'featured' ? 'flex items-start gap-4 p-5' : 'flex flex-col p-4',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md',
          isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400',
          variant === 'featured' ? 'h-10 w-10' : 'mb-3 h-8 w-8',
        )}
      >
        <Icon className={variant === 'featured' ? 'h-5 w-5' : 'h-4 w-4'} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium',
            isActive ? 'text-zinc-900' : 'text-zinc-500',
            variant === 'featured' ? 'text-sm mb-1' : 'text-xs mb-1.5',
          )}
        >
          {type.title}
        </p>
        <p
          className={cn(
            'leading-relaxed',
            isActive ? 'text-zinc-500' : 'text-zinc-400',
            variant === 'featured' ? 'text-sm' : 'text-xs',
          )}
        >
          {type.description}
        </p>
      </div>

      {/* CTA or status pill */}
      {isActive && type.ctaLabel ? (
        <div className="shrink-0 self-center">
          <span className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            {type.ctaLabel}
          </span>
        </div>
      ) : type.statusLabel ? (
        <div className={cn('shrink-0', variant === 'featured' ? 'self-center' : 'mt-3')}>
          <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-400">
            {type.statusLabel}
          </span>
        </div>
      ) : null}
    </div>
  )

  if (isActive && type.route) {
    return <Link href={type.route}>{cardContent}</Link>
  }

  return cardContent
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/create/CreateCard.tsx
git commit -m "feat(create): add CreateCard component with active/coming-soon states"
```

---

## Task 3: Create Hub Page

**Files:**
- Create: `app/(dashboard)/create/page.tsx`

- [ ] **Step 1: Create the hub page**

The page is a React Server Component (no `'use client'`). It imports the registry helpers and `CreateCard`, renders active types as featured rows and coming-soon types in a 2-col grid.

```tsx
// app/(dashboard)/create/page.tsx
import { activeTypes, comingSoonTypes } from '@/lib/content/contentTypes'
import { CreateCard } from '@/components/create/CreateCard'

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-2 font-[Signifier] text-2xl font-semibold text-zinc-900">
          Create Content
        </h1>
        <p className="text-sm text-zinc-500">
          Generate platform-native content, long-form writing, and editorial assets from a single
          workflow.
        </p>
      </div>

      {/* Active types — full-width featured */}
      {activeTypes.length > 0 && (
        <section className="mb-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Available Now
          </p>
          <div className="flex flex-col gap-3">
            {activeTypes.map((type) => (
              <CreateCard key={type.id} type={type} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Coming soon types — 2-col grid */}
      {comingSoonTypes.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Coming Soon
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comingSoonTypes.map((type) => (
              <CreateCard key={type.id} type={type} variant="grid" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify the page renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/create`. Verify:
- Heading "Create Content" visible
- Blog Post card renders as a full-width active card with dark CTA button
- LinkedIn Post and Newsletter render as muted 2-col cards with "Coming Soon" pill (not button)
- Clicking the Blog Post card routes to `/create/blog` (will 404 until Task 4)
- Clicking a coming-soon card does nothing

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/create/page.tsx
git commit -m "feat(create): add Create hub page with registry-driven card grid"
```

---

## Task 4: Blog Post Shell Page

**Files:**
- Create: `app/(dashboard)/create/blog/page.tsx`

- [ ] **Step 1: Create the blog shell page**

Six placeholder section cards in a 3-col grid. Each card has a centered icon and label — no interaction, no logic.

```tsx
// app/(dashboard)/create/blog/page.tsx
import {
  Search,
  Type,
  AlignLeft,
  LayoutList,
  Image,
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const sections: { label: string; icon: LucideIcon }[] = [
  { label: 'Primary Keyword', icon: Search },
  { label: 'Meta Title', icon: Type },
  { label: 'Meta Description', icon: AlignLeft },
  { label: 'Content Structure', icon: LayoutList },
  { label: 'Images', icon: Image },
  { label: 'Draft Generation', icon: Wand2 },
]

export default function BlogCreatePage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-2 font-[Signifier] text-2xl font-semibold text-zinc-900">
          Blog Post Creation
        </h1>
        <p className="text-sm text-zinc-500">
          Create SEO-ready long-form content with metadata, structure, imagery, and AI-assisted
          drafting workflows.
        </p>
      </div>

      {/* Placeholder section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-8 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100">
              <Icon className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/create/blog`. Verify:
- Heading "Blog Post Creation" visible
- 6 placeholder cards in a 3-col grid (stacks on mobile)
- Cards are purely visual — no hover states, no interaction
- Back-navigating to `/create` still works correctly

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/create/blog/page.tsx
git commit -m "feat(create): add Blog Post shell page with placeholder sections"
```

---

## Task 5: Sidebar Nav Item

**Files:**
- Modify: `components/shell/sidebar.tsx`

- [ ] **Step 1: Add Sparkles import and Create nav item**

Open `components/shell/sidebar.tsx`. The current imports line is:

```ts
import {
  LayoutDashboard,
  Zap,
  Lock,
  PenSquare,
  Layers,
  Radio,
  BarChart2,
  CreditCard,
  Settings,
  Inbox,
  CalendarClock,
  ListOrdered,
  HelpCircle,
  Palette,
  Network,
  Share2,
} from 'lucide-react'
```

Add `Sparkles` to the import list:

```ts
import {
  LayoutDashboard,
  Zap,
  Lock,
  PenSquare,
  Layers,
  Radio,
  BarChart2,
  CreditCard,
  Settings,
  Inbox,
  CalendarClock,
  ListOrdered,
  HelpCircle,
  Palette,
  Network,
  Share2,
  Sparkles,
} from 'lucide-react'
```

- [ ] **Step 2: Insert Create into navItems between Capture and Studio**

The current `navItems` array is:

```ts
const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Queue', href: '/queue', icon: ListOrdered },
  { label: 'Capture', href: '/capture', icon: Zap },
  { label: 'Private', href: '/private', icon: Lock },
  { label: 'Content Analyzer', href: '/analyze', icon: Network },
  { label: 'Syndication', href: '/syndication', icon: Share2 },
  { label: 'Studio', href: '/studio', icon: PenSquare },
  { label: 'Schedule', href: '/schedule', icon: CalendarClock },
  { label: 'Lenses', href: '/lenses', icon: Layers },
  { label: 'Channels', href: '/channels', icon: Radio },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
]
```

Replace it with:

```ts
const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Queue', href: '/queue', icon: ListOrdered },
  { label: 'Capture', href: '/capture', icon: Zap },
  { label: 'Create', href: '/create', icon: Sparkles },
  { label: 'Private', href: '/private', icon: Lock },
  { label: 'Content Analyzer', href: '/analyze', icon: Network },
  { label: 'Syndication', href: '/syndication', icon: Share2 },
  { label: 'Studio', href: '/studio', icon: PenSquare },
  { label: 'Schedule', href: '/schedule', icon: CalendarClock },
  { label: 'Lenses', href: '/lenses', icon: Layers },
  { label: 'Channels', href: '/channels', icon: Radio },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
]
```

> Note: The existing active state logic `pathname === href || pathname.startsWith(href + '/')` already handles nested routes correctly — `/create/blog` will highlight the Create item automatically.

- [ ] **Step 3: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify sidebar in browser**

With `npm run dev` running, check:
- "Create" appears in the sidebar between Capture and Private
- Sparkles icon renders correctly
- Navigating to `/create` highlights Create in the sidebar
- Navigating to `/create/blog` also highlights Create (not a separate item)
- All other nav items still work and highlight correctly

- [ ] **Step 5: Commit**

```bash
git add components/shell/sidebar.tsx
git commit -m "feat(create): add Create nav item to sidebar between Capture and Studio"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Full TypeScript compile**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02" && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: build completes with no errors. (Warnings about `font-[Signifier]` are acceptable if they appear — the token is already used elsewhere in the codebase.)

- [ ] **Step 3: End-to-end walkthrough**

With `npm run dev`:

1. Load any dashboard page — sidebar shows Create between Capture and Private
2. Click Create → `/create` loads, Blog Post card is active and clickable, LinkedIn/Newsletter show muted "Coming Soon" pill
3. Click "Create Blog Post" → `/create/blog` loads with 6 placeholder section cards
4. Navigate back to `/create` — works, sidebar highlights Create
5. Navigate to `/dashboard` — Create is no longer highlighted
6. Resize browser to mobile width — hub page cards stack to 1 col, blog page cards stack to 1 col, sidebar behavior unchanged
7. Click a coming-soon card — nothing happens (no navigation, no error)

- [ ] **Step 4: Final commit (if any uncommitted changes)**

```bash
git status
# commit anything remaining
```
