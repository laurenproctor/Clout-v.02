# Mobile Responsive Design Spec

**Date:** 2026-05-13  
**Scope:** Full app — dashboard + marketing  
**Target devices:** Phones (375–430px) and tablets (640–1024px)  
**Nav pattern:** Hamburger + slide drawer (B)  
**Approach:** Navigation & shared components first, then pages, then feature flows

---

## Breakpoint Strategy

Using Tailwind's standard breakpoints:
- Base (default): phones < 640px
- `sm:` 640px+ — tablets (iPad portrait)
- `md:` 768px+ — large tablets / small laptops
- `lg:` 1024px+ — desktop

---

## Section 1: Shell & Navigation

### `app/(dashboard)/layout.tsx`
- Change `h-screen` → `h-dvh` (fixes iOS address bar dynamic viewport bug)
- Add `sm:p-5` between existing `p-4` and `md:p-6` on the main content area

### `components/shell/sidebar.tsx`
- Keep existing `hidden md:flex` + Sheet drawer pattern (already implements chosen B pattern)
- Widen Sheet from `w-[220px]` → `min(280px, 85vw)` so it doesn't clip on small phones or overwhelm tablets
- Add iOS safe area padding: `pb-safe` / `padding-bottom: env(safe-area-inset-bottom)` to drawer footer

### `components/shell/top-nav.tsx`
- Increase hamburger button tap target from `p-1.5` → `p-2` (44×44px minimum)
- Existing `px-4 md:px-6` is correct — no structural changes needed

---

## Section 2: Shared Components & Typography

### Touch targets (global)
- All icon-only buttons get `min-w-[44px] min-h-[44px]` or sufficient padding (`p-2` minimum) for thumb-friendliness
- Apply consistently across edit, delete, copy, action buttons throughout the app

### Form inputs (global)
- All `<input>`, `<textarea>`, `<select>` elements must have `text-base` (16px) on mobile to prevent iOS auto-zoom on focus
- Where `text-sm` is used on inputs, add `text-base md:text-sm` or use `text-sm` only with `md:` prefix on the label wrapper, not the input itself

### Overflow tables / wide content (global)
- Wrap any horizontally-constrained data grids or wide content in `overflow-x-auto` so they scroll horizontally rather than breaking layout

### Typography scale
- Any heading that jumps >50% between base and `md:` gets an intermediate `sm:` step
- Specifically: hero `text-[32px] md:text-[56px]` → `text-[32px] sm:text-[44px] md:text-[56px]`

---

## Section 3: Marketing Site

### Hero section (`app/(marketing)/page.tsx`)
- Hero heading: `text-[32px]` → `text-[32px] sm:text-[44px] md:text-[56px]`
- CTA heading: `text-[28px] md:text-[40px]` → `text-[28px] sm:text-[36px] md:text-[40px]`

### Feature cards grid
- `grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12` → add `sm:grid-cols-2` so tablets show 2 columns before desktop 3-column layout

### Legal pages (Privacy Policy, Terms of Service)
- Sticky sidebar TOC (`w-56 sticky top-10`): add `hidden lg:block` so it only appears on desktop
- Render an inline version of the TOC above the content on mobile/tablet (collapsed by default or shown as a flat list)

---

## Section 4: Dashboard Pages

### Analytics page (`app/(dashboard)/analytics/page.tsx`)
- Stats grid: `grid grid-cols-3` → `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- Status/breakdown grid: `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2`

### Brand settings page (`app/(dashboard)/settings/brand/page.tsx`)
- Two-panel layout: change `flex gap-8` with `w-80 shrink-0` right panel → `flex flex-col lg:flex-row gap-8`
- Right preview panel: change `w-80 shrink-0` → `w-full lg:w-80 lg:shrink-0`

### Studio editor (`app/(dashboard)/studio/[id]/page.tsx`)
- Replace `calc(100vh - 56px)` height calculations → `calc(100dvh - 56px)` or convert to flex fill (`flex-1`) where possible

### All other dashboard pages
- Dashboard, create, inbox, channels, settings, schedule pages are structurally responsive
- Spot-check padding and spacing at `sm:` breakpoints during implementation and add intermediate values where gaps feel large

---

## Section 5: Feature Flows

### BlogWorkspace (`components/blog/BlogWorkspace.tsx`)
- Two-panel layout (`flex` with `flex-1` content + `w-72 shrink-0` sidebar):
  - Change to `flex flex-col lg:flex-row` — sidebar stacks below main content on mobile/tablet
  - Sidebar: `w-72 shrink-0` → `w-full lg:w-72 lg:shrink-0`
- Padding: `px-8 py-6` throughout → `px-4 py-4 md:px-6 lg:px-8 lg:py-6`

### Capture composer (`components/capture/capture-composer.tsx`)
- Tab bar (6 tabs): add `overflow-x-auto` to the tab container so it scrolls horizontally on narrow screens; also add `flex-shrink-0` to each tab button to prevent squishing
- Platform buttons (5 buttons, `flex` without wrap): add `flex-wrap` to the container

### AI actions panel (`components/studio/ai-actions-panel.tsx`)
- Fixed width: `w-[280px]` → `w-full sm:w-[280px]` so the panel goes full-width on phones

### Link capture modal (`components/capture/link-capture-flow.tsx`)
- Content grid: `grid grid-cols-1 md:grid-cols-3` → `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3`

---

## Implementation Order

1. **Shell** — `layout.tsx`, `sidebar.tsx`, `top-nav.tsx`
2. **Global patterns** — touch targets, form input font sizes, overflow wrappers
3. **Marketing site** — hero typography, feature grid, legal page TOC
4. **Dashboard pages** — analytics, brand settings, studio height
5. **Feature flows** — BlogWorkspace, capture composer, AI panel, link capture modal

---

## Out of Scope

- Dark mode responsiveness (existing dark mode classes stay as-is)
- New navigation items or restructuring the sidebar nav links
- Redesigning any feature's UX — purely layout and spacing changes
- Adding new breakpoints beyond standard Tailwind `sm:`/`md:`/`lg:`
