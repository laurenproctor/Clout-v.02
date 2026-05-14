# Mobile Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire Clout app (dashboard + marketing) responsive for phones (375–430px) and tablets (640–1024px) using the hamburger+drawer nav pattern already in place.

**Architecture:** Tailwind utility-class changes only — no new components, no structural refactors. Work outward from the shell (layout → nav → shared patterns) then inward to pages and feature flows. Each task is a focused set of className changes in one file.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui, TypeScript

---

## Files Modified

| File | What changes |
|---|---|
| `app/(dashboard)/layout.tsx` | `h-screen→h-dvh`, add `sm:p-5` |
| `components/shell/sidebar.tsx` | Widen Sheet drawer, add safe-area padding |
| `components/shell/top-nav.tsx` | Hamburger tap target |
| `app/globals.css` | Global input font-size floor (prevents iOS auto-zoom) |
| `app/(marketing)/page.tsx` | Hero/CTA typography, How-it-works grid |
| `app/(marketing)/privacy-policy/page.tsx` | Body container padding |
| `app/(marketing)/terms-of-service/page.tsx` | Body container padding |
| `app/(dashboard)/analytics/page.tsx` | Stats grids + loading skeleton grids |
| `app/(dashboard)/settings/brand/page.tsx` | Two-panel → stacked below lg |
| `app/(dashboard)/studio/[id]/page.tsx` | `100vh→100dvh` |
| `components/blog/BlogWorkspace.tsx` | Two-panel → stacked below lg, padding |
| `components/capture/capture-composer.tsx` | Scrollable tab bar, flex-wrap platform buttons |
| `components/studio/ai-actions-panel.tsx` | Full-width on phones |
| `components/capture/link-capture-flow.tsx` | Grid sm:cols-2 step |

---

## Task 1: Dashboard Shell — layout & main content

**Files:**
- Modify: `app/(dashboard)/layout.tsx:26,30`

- [ ] **Step 1: Fix viewport height and padding**

In `app/(dashboard)/layout.tsx`, apply both changes:

```tsx
// line 26: h-screen → h-dvh
<div className="flex h-dvh overflow-hidden bg-zinc-50 text-[120%]">

// line 30: add sm:p-5 between p-4 and md:p-6
<main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open `http://localhost:3000/dashboard` in Chrome DevTools at 390×844 (iPhone 14). Confirm the bottom of the page is not clipped by the browser chrome.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/layout.tsx
git commit -m "fix: use h-dvh and add sm padding step in dashboard layout"
```

---

## Task 2: Sidebar drawer width + safe area

**Files:**
- Modify: `components/shell/sidebar.tsx:190`

- [ ] **Step 1: Widen the Sheet and add safe-area padding to drawer footer**

In `components/shell/sidebar.tsx`:

```tsx
// line 190 — change Sheet width and add safe-area inset to footer
<SheetContent side="left" className="p-0 w-[min(280px,85vw)] flex flex-col [&>button]:hidden">

// line 113 — add pb-safe to the bottom section
<div className="border-t border-zinc-200 p-2 space-y-0.5 pb-[env(safe-area-inset-bottom)]">
```

- [ ] **Step 2: Verify visually**

Open DevTools, switch to iPhone 14 Pro, open the hamburger menu. Confirm the drawer is not full-screen but also not clipping on a 375px-wide device.

- [ ] **Step 3: Commit**

```bash
git add components/shell/sidebar.tsx
git commit -m "fix: widen mobile drawer to min(280px,85vw) and add safe-area padding"
```

---

## Task 3: Top-nav hamburger tap target

**Files:**
- Modify: `components/shell/top-nav.tsx:33`

- [ ] **Step 1: Increase padding on the menu button**

In `components/shell/top-nav.tsx`, line 33:

```tsx
// before
className="md:hidden rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"

// after
className="md:hidden rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
```

- [ ] **Step 2: Commit**

```bash
git add components/shell/top-nav.tsx
git commit -m "fix: increase hamburger button tap target to p-2"
```

---

## Task 4: Global form input font-size floor

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add mobile input font-size override to prevent iOS auto-zoom**

iOS auto-zooms when an input's font-size is below 16px. Add a base style to `app/globals.css` after the existing `@import` lines:

```css
/* Prevent iOS auto-zoom on input focus */
@media (max-width: 767px) {
  input,
  textarea,
  select {
    font-size: max(16px, 1em);
  }
}
```

- [ ] **Step 2: Verify**

On an iPhone simulator or Chrome DevTools at 390px, tap into the search/URL input on the Brand Settings page. The page should not zoom in.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "fix: prevent iOS auto-zoom by setting min 16px font-size on mobile inputs"
```

---

## Task 5: Marketing — hero/CTA typography + How-it-works grid

**Files:**
- Modify: `app/(marketing)/page.tsx:45,97,208`

- [ ] **Step 1: Add sm: intermediate step to hero heading**

In `app/(marketing)/page.tsx`, line 45:

```tsx
// before
className="text-[32px] leading-[1.1] tracking-[-0.02em] mb-8 md:text-[56px] md:leading-[1.05]"

// after
className="text-[32px] leading-[1.1] tracking-[-0.02em] mb-8 sm:text-[44px] md:text-[56px] md:leading-[1.05]"
```

- [ ] **Step 2: Add sm:grid-cols-2 to How-it-works grid**

In `app/(marketing)/page.tsx`, line 97:

```tsx
// before
className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12"

// after
className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 md:gap-12"
```

Note: a 3-step sequence (1→2→3) means the middle step always has an orphaned card. For 3 items this is acceptable — the 2-col tablet view shows 2 cards + 1 full-width below.

- [ ] **Step 3: Add sm: step to CTA heading**

In `app/(marketing)/page.tsx`, line 208:

```tsx
// before
className="text-[28px] leading-[1.15] tracking-[-0.01em] text-white mb-6 md:text-[40px] md:leading-[1.1]"

// after
className="text-[28px] leading-[1.15] tracking-[-0.01em] text-white mb-6 sm:text-[36px] md:text-[40px] md:leading-[1.1]"
```

- [ ] **Step 4: Verify visually**

Open DevTools, view the marketing page at 390px (phone), 768px (tablet), 1280px (desktop). Confirm text scales smoothly and the grid shows 1 col / 2 col / 3 col at each breakpoint.

- [ ] **Step 5: Commit**

```bash
git add "app/(marketing)/page.tsx"
git commit -m "fix: add sm: typography steps and grid column for marketing page"
```

---

## Task 6: Legal pages — body container padding

**Files:**
- Modify: `app/(marketing)/privacy-policy/page.tsx:181`
- Modify: `app/(marketing)/terms-of-service/page.tsx:144`

Note: Both legal pages already have `hidden lg:block` on the TOC sidebar — no change needed there.

- [ ] **Step 1: Fix padding on Privacy Policy body container**

In `app/(marketing)/privacy-policy/page.tsx`, line 181:

```tsx
// before
<div className="flex px-10 py-16 gap-16 max-w-6xl">

// after
<div className="flex px-5 py-10 gap-16 md:px-10 md:py-16 max-w-6xl">
```

- [ ] **Step 2: Fix padding on Terms of Service body container**

In `app/(marketing)/terms-of-service/page.tsx`, line 144:

```tsx
// before
<div className="flex px-10 py-16 gap-16 max-w-6xl">

// after
<div className="flex px-5 py-10 gap-16 md:px-10 md:py-16 max-w-6xl">
```

- [ ] **Step 3: Verify**

View both legal pages at 390px in DevTools. Content should have comfortable side padding (20px), not be squeezed.

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/privacy-policy/page.tsx" "app/(marketing)/terms-of-service/page.tsx"
git commit -m "fix: responsive padding on legal page body containers"
```

---

## Task 7: Analytics — responsive stat grids

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx:157,234,277`

- [ ] **Step 1: Fix loading skeleton grid**

In `app/(dashboard)/analytics/page.tsx`, line 157:

```tsx
// before
<div className="grid grid-cols-3 gap-4">

// after
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

- [ ] **Step 2: Fix live summary stats grid**

In `app/(dashboard)/analytics/page.tsx`, line 234:

```tsx
// before
<div className="grid grid-cols-3 gap-4">

// after
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

- [ ] **Step 3: Fix status/breakdown 2-col grid**

In `app/(dashboard)/analytics/page.tsx`, line 277:

```tsx
// before
<div className="grid grid-cols-2 gap-4">

// after
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

- [ ] **Step 4: Add overflow-x-auto to bar chart containers**

The "Captures per month" and "Outputs per month" charts use `flex items-end gap-1` with many bars that can overflow on narrow screens. Wrap each chart's bar row:

In `app/(dashboard)/analytics/page.tsx`, find the two `<div className="flex items-end gap-1">` elements (inside the "Captures per month" and "Outputs per month" cards) and add `overflow-x-auto`:

```tsx
// before (both occurrences)
<div className="flex items-end gap-1">

// after (both occurrences)
<div className="flex items-end gap-1 overflow-x-auto">
```

- [ ] **Step 6: Verify**

Open Analytics page at 390px. The 3 summary stats should stack vertically. The status breakdown should show full-width cards. At 768px they should go 2-col.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/analytics/page.tsx"
git commit -m "fix: responsive grids and chart overflow on analytics page"
```

---

## Task 8: Brand settings — two-panel layout

**Files:**
- Modify: `app/(dashboard)/settings/brand/page.tsx:236,543`

- [ ] **Step 1: Make the outer flex container stack on mobile**

In `app/(dashboard)/settings/brand/page.tsx`, line 236:

```tsx
// before
<div className="flex gap-8">

// after
<div className="flex flex-col lg:flex-row gap-8">
```

- [ ] **Step 2: Make the right preview panel full-width on mobile**

In `app/(dashboard)/settings/brand/page.tsx`, line 543:

```tsx
// before
<div className="w-80 shrink-0">

// after
<div className="w-full lg:w-80 lg:shrink-0">
```

- [ ] **Step 3: Verify**

Open Brand Settings at 390px. The Live Preview panel should appear below the form. At 1024px+ it should appear to the right.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/settings/brand/page.tsx"
git commit -m "fix: brand settings preview panel stacks below form on mobile"
```

---

## Task 9: Studio editor — dynamic viewport height

**Files:**
- Modify: `app/(dashboard)/studio/[id]/page.tsx:243,255,265`

- [ ] **Step 1: Replace all calc(100vh) with calc(100dvh)**

In `app/(dashboard)/studio/[id]/page.tsx`, there are three inline style occurrences of `calc(100vh - 56px)`. Replace all three:

Line 243:
```tsx
// before
style={{ minHeight: 'calc(100vh - 56px)' }}

// after
style={{ minHeight: 'calc(100dvh - 56px)' }}
```

Line 255:
```tsx
// before
style={{ minHeight: 'calc(100vh - 56px)' }}

// after
style={{ minHeight: 'calc(100dvh - 56px)' }}
```

Line 265:
```tsx
// before
<div className="-m-6 flex flex-col bg-zinc-950" style={{ minHeight: 'calc(100vh - 56px)' }}>

// after
<div className="-m-6 flex flex-col bg-zinc-950" style={{ minHeight: 'calc(100dvh - 56px)' }}>
```

- [ ] **Step 2: Verify**

Open a studio draft on an iOS simulator or Chrome DevTools at iPhone 14 size. The editor should fill the visible screen without being clipped under the browser chrome.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/studio/[id]/page.tsx"
git commit -m "fix: use 100dvh in studio editor to fix iOS viewport clipping"
```

---

## Task 10: BlogWorkspace — two-panel → stacked layout

**Files:**
- Modify: `components/blog/BlogWorkspace.tsx` (multiple lines)

The BlogWorkspace has the two-panel pattern (`flex-1` content + `w-72 shrink-0` sidebar) in multiple render states. Run this search first to confirm all occurrences:

```bash
grep -n "w-72 shrink-0" components/blog/BlogWorkspace.tsx
```

For each occurrence, apply the same pattern. There are also corresponding parent flex containers to update.

- [ ] **Step 1: Fix narrative-review state (around line 421)**

Find the outer flex container for the narrative-review two-panel layout:
```tsx
// before
<div className="flex flex-1 min-h-0 overflow-hidden">

// after
<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
```

Find the left column in that same block:
```tsx
// before
<div className="flex-1 overflow-y-auto px-8 py-6">

// after
<div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6">
```

Find the right sidebar in that same block (around line 492):
```tsx
// before
<div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-6 py-6">

// after
<div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:py-6">
```

- [ ] **Step 2: Fix article-strategy state (around line 515)**

Apply the same three changes to the article-strategy state's two-panel layout. The pattern is identical — find the `flex flex-1 min-h-0 overflow-hidden` outer container and the `w-72 shrink-0` sidebar around line 594.

Parent container:
```tsx
// before
<div className="flex flex-1 min-h-0 overflow-hidden">

// after
<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
```

Left column:
```tsx
// before
<div className="flex-1 overflow-y-auto px-8 py-6">

// after
<div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6">
```

Right sidebar (around line 594):
```tsx
// before
<div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-4 py-6">

// after
<div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:py-6">
```

- [ ] **Step 3: Fix result state (around line 610)**

Apply the same three changes to the result state:

Parent container (line 610):
```tsx
// before
<div className="flex flex-1 min-h-0 gap-0 overflow-hidden">

// after
<div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-0 overflow-hidden">
```

Left column (line 611):
```tsx
// before
<div className="flex-1 overflow-y-auto px-8 py-6 min-w-0">

// after
<div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6 min-w-0">
```

Right sidebar (line 620):
```tsx
// before
<div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto px-4 py-6">

// after
<div className="w-full lg:w-72 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 overflow-y-auto px-4 py-4 lg:py-6">
```

- [ ] **Step 4: Verify no remaining w-72 occurrences are unfixed**

```bash
grep -n "w-72 shrink-0" components/blog/BlogWorkspace.tsx
```

All remaining matches should now have been updated to `w-full lg:w-72 lg:shrink-0`.

- [ ] **Step 5: Verify visually**

Open a blog draft at 390px. The sidebar (Article Preview / Strategic Insights) should appear below the main content. At 1024px+ it should appear to the right.

- [ ] **Step 6: Commit**

```bash
git add components/blog/BlogWorkspace.tsx
git commit -m "fix: BlogWorkspace two-panel layout stacks vertically below lg breakpoint"
```

---

## Task 11: Capture composer — scrollable tab bar + flex-wrap platform buttons

**Files:**
- Modify: `components/capture/capture-composer.tsx:508,730`

- [ ] **Step 1: Make the mode tab bar horizontally scrollable**

In `components/capture/capture-composer.tsx`, line 508, change the mode bar container and add `shrink-0` to each tab button:

```tsx
// before — line 508
<div className="flex items-center gap-0 border-b border-zinc-100 px-5 pt-4 pb-0">
  {(['assistant', 'write', 'paste', 'upload', 'voice', 'topic'] as CaptureMode[]).map((mode) => (
    <button
      key={mode}
      type="button"
      onClick={() => switchMode(mode)}
      className={cn(
        'pb-3 px-3 text-sm font-medium transition-colors capitalize border-b-2 -mb-px',

// after — line 508
<div className="flex items-center gap-0 border-b border-zinc-100 px-5 pt-4 pb-0 overflow-x-auto">
  {(['assistant', 'write', 'paste', 'upload', 'voice', 'topic'] as CaptureMode[]).map((mode) => (
    <button
      key={mode}
      type="button"
      onClick={() => switchMode(mode)}
      className={cn(
        'pb-3 px-3 text-sm font-medium transition-colors capitalize border-b-2 -mb-px shrink-0',
```

- [ ] **Step 2: Add flex-wrap to platform buttons**

In `components/capture/capture-composer.tsx`, around line 730, find the platform buttons container:

```tsx
// before
<div className="flex items-center gap-1.5">
  {['LinkedIn', 'X', 'Threads', 'Email', 'Blog'].map((t) => (

// after
<div className="flex flex-wrap items-center gap-1.5">
  {['LinkedIn', 'X', 'Threads', 'Email', 'Blog'].map((t) => (
```

- [ ] **Step 3: Verify**

Open the Capture page at 390px. The mode tabs should scroll horizontally without breaking layout. The platform buttons should wrap to a second line when they don't fit.

- [ ] **Step 4: Commit**

```bash
git add components/capture/capture-composer.tsx
git commit -m "fix: scrollable mode tabs and flex-wrap platform buttons in capture composer"
```

---

## Task 12: AI actions panel — full-width on phones

**Files:**
- Modify: `components/studio/ai-actions-panel.tsx:60`

- [ ] **Step 1: Make panel full-width below sm breakpoint**

In `components/studio/ai-actions-panel.tsx`, line 60:

```tsx
// before
'fixed right-0 top-0 bottom-0 z-40 w-[280px] flex flex-col',

// after
'fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[280px] flex flex-col',
```

- [ ] **Step 2: Verify**

Open a studio draft at 390px, click the AI Actions button. The panel should cover the full screen width. At 640px+ it should be 280px wide on the right side.

- [ ] **Step 3: Commit**

```bash
git add components/studio/ai-actions-panel.tsx
git commit -m "fix: AI actions panel full-width on phones"
```

---

## Task 13: Link capture modal — sm:grid-cols-2 step

**Files:**
- Modify: `components/capture/link-capture-flow.tsx` (around line 269)

- [ ] **Step 1: Add sm: column step to draft cards grid**

In `components/capture/link-capture-flow.tsx`, find the draft cards grid container (grep for `grid grid-cols-1 md:grid-cols-3`):

```tsx
// before
<div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

// after
<div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 items-start">
```

(Also reduced `p-8` to `p-4 sm:p-8` since 32px padding on a 375px phone is cramped.)

- [ ] **Step 2: Verify**

Trigger the link capture flow on mobile. The draft cards should show 1 column on phones, 2 on tablets, 3 on desktop.

- [ ] **Step 3: Commit**

```bash
git add components/capture/link-capture-flow.tsx
git commit -m "fix: add sm:grid-cols-2 step and responsive padding to link capture draft cards"
```

---

## Final Verification

- [ ] **Full mobile pass**

In Chrome DevTools, set to iPhone 14 (390×844). Navigate through these pages and check nothing overflows or clips:
1. `/` (marketing homepage)
2. `/privacy-policy`
3. `/dashboard`
4. `/analytics`
5. `/settings/brand`
6. `/studio/[any id]`
7. `/capture` (open the composer, check tabs and platform buttons)
8. Open the hamburger nav, verify drawer width

- [ ] **Tablet pass**

Switch DevTools to iPad Mini (768×1024). Check the same pages. Key things to verify:
- Analytics stats show 2-col not 1-col
- Brand settings shows the preview below (lg:flex-row kicks in at 1024px, not 768px — preview will be below at this size, which is correct per spec)
- BlogWorkspace sidebar stacks below on 768px tablet (lg:flex-row kicks in at 1024px)

- [ ] **Desktop regression check**

Switch to 1440×900. Verify nothing changed on desktop — all layouts should look identical to before.
