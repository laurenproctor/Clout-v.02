# Inbox Post Preview Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 920px side drawer to the Inbox page so users can read the full post, see its channel, and approve/skip/edit — all without leaving the list.

**Architecture:** Three changes work together — (1) the weekly-plan API joins channel data so the UI knows each post's platform, (2) a new `PostDrawer` component renders the drawer UI with prev/next navigation and keyboard shortcuts, (3) `InboxPage` manages drawer state and passes it down, while `PlanCard` gains active styling.

**Tech Stack:** Next.js App Router, React (useState/useEffect/useCallback), Tailwind CSS, TypeScript, Supabase (join via `.select` relation syntax), Lucide icons.

---

## File Map

| File | Action | Responsibility |
| ---- | ------ | -------------- |
| `lib/domain/weekly-plan.ts` | Modify | Join `channels` table in `buildWeeklyPlan`; update `mapOutputRow` to populate `output.channels` |
| `app/(dashboard)/inbox/PostDrawer.tsx` | Create | Drawer UI: header (meta row, prev/next, close), scrollable body, sticky footer, keyboard shortcuts |
| `app/(dashboard)/inbox/page.tsx` | Modify | Drawer open/close state, active index, keyboard handler wiring, updated `PlanCard` active styling + channel badge |

---

## Task 1: Join channel data in the weekly-plan domain

**Files:**
- Modify: `lib/domain/weekly-plan.ts`

The `outputs` table has a `channel_id` FK to `channels`. Supabase supports joined selects via `channels(platform, label)`. We update the select string and `mapOutputRow` to populate `output.channels`.

- [ ] **Step 1: Update the select string in `buildWeeklyPlan`**

In `lib/domain/weekly-plan.ts`, find the `supabase.from('outputs').select(...)` call (around line 79) and replace the select string:

```ts
const { data: rows, error } = await supabase
  .from('outputs')
  .select('id, workspace_id, generation_id, channel_id, title, content, status, approved_by, approved_at, provider_post_id, published_at, scheduled_at, last_publish_error, approved_for_week, week_bucket, performance_snapshot, created_at, updated_at, channels(platform, label)')
  .eq('workspace_id', workspaceId)
  .in('status', ['draft', 'review', 'approved'])
  .eq('approved_for_week', false)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(50)
```

- [ ] **Step 2: Update `mapOutputRow` to include the joined channel**

Replace the existing `mapOutputRow` function:

```ts
function mapOutputRow(row: Record<string, unknown>): Output {
  const ch = row.channels as { platform: string; label: string | null } | null
  return {
    id:                  row.id as string,
    workspaceId:         row.workspace_id as string,
    generationId:        row.generation_id as string,
    channelId:           row.channel_id as string | null,
    status:              row.status as OutputStatus,
    title:               row.title as string | null,
    content:             row.content as OutputContent,
    approvedBy:          row.approved_by as string | null,
    approvedAt:          row.approved_at as string | null,
    providerPostId:      row.provider_post_id as string | null,
    publishedAt:         row.published_at as string | null,
    scheduledAt:         row.scheduled_at as string | null,
    lastPublishError:    row.last_publish_error as string | null,
    approvedForWeek:     (row.approved_for_week as boolean) ?? false,
    weekBucket:          row.week_bucket as string | null,
    performanceSnapshot: row.performance_snapshot as Record<string, unknown> | null,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
    channels:            ch ? { platform: ch.platform as import('@/types/domain').ChannelPlatform, label: ch.label } : undefined,
  }
}
```

- [ ] **Step 3: Update `mapItem` in `app/(dashboard)/inbox/page.tsx` to forward channel data**

Find the `mapItem` function and add `channels` to the mapped output:

```ts
function mapItem(raw: Record<string, unknown>): WeeklyPlanItem {
  const o = raw.output as Record<string, unknown>
  const ch = o.channels as { platform: string; label: string | null } | undefined
  return {
    suggestedSlot: raw.suggestedSlot as string | null,
    rank: raw.rank as number,
    output: {
      id:                  o.id as string,
      workspaceId:         o.workspaceId as string,
      generationId:        o.generationId as string,
      channelId:           o.channelId as string | null,
      status:              o.status as Output['status'],
      title:               o.title as string | null,
      content:             o.content as OutputContent,
      approvedBy:          o.approvedBy as string | null,
      approvedAt:          o.approvedAt as string | null,
      providerPostId:      o.providerPostId as string | null,
      publishedAt:         o.publishedAt as string | null,
      scheduledAt:         o.scheduledAt as string | null,
      lastPublishError:    o.lastPublishError as string | null,
      approvedForWeek:     (o.approvedForWeek as boolean) ?? false,
      weekBucket:          o.weekBucket as string | null,
      performanceSnapshot: o.performanceSnapshot as Record<string, unknown> | null,
      createdAt:           o.createdAt as string,
      updatedAt:           o.updatedAt as string,
      channels:            ch ? { platform: ch.platform as Output['channels']['platform'], label: ch.label } : undefined,
    },
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `channels` or `mapOutputRow`.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/weekly-plan.ts app/(dashboard)/inbox/page.tsx
git commit -m "feat(inbox): join channel data in weekly-plan API"
```

---

## Task 2: Build the PostDrawer component

**Files:**
- Create: `app/(dashboard)/inbox/PostDrawer.tsx`

This component owns all drawer UI. It receives data and callbacks from the parent — no internal fetch.

- [ ] **Step 1: Create `app/(dashboard)/inbox/PostDrawer.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { DateTime } from 'luxon'
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyPlanItem } from '@/types/domain'

interface PostDrawerProps {
  items: WeeklyPlanItem[]
  activeIndex: number
  isActing: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onApprove: (id: string, scheduledAt: string | null) => void
  onSkip: (id: string) => void
  onEdit: (id: string) => void
}

function formatSlot(iso: string | null): string {
  if (!iso) return 'No slot assigned'
  return DateTime.fromISO(iso).toLocal().toFormat("EEE, MMM d · h:mm a") + ' · Suggested'
}

function channelLabel(item: WeeklyPlanItem): string {
  if (item.output.channels?.label) return item.output.channels.label
  if (item.output.channels?.platform) return item.output.channels.platform
  return 'Unknown'
}

export function PostDrawer({
  items,
  activeIndex,
  isActing,
  onClose,
  onPrev,
  onNext,
  onApprove,
  onSkip,
  onEdit,
}: PostDrawerProps) {
  const item = items[activeIndex]
  const total = items.length
  const isFirst = activeIndex === 0
  const isLast = activeIndex === total - 1

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'j' || e.key === 'J') { if (!isLast) onNext(); return }
      if (e.key === 'k' || e.key === 'K') { if (!isFirst) onPrev(); return }
      if ((e.key === 'a' || e.key === 'A') && !isActing) {
        onApprove(item.output.id, item.suggestedSlot)
        return
      }
      if (e.key === 'e' || e.key === 'E') { onEdit(item.output.id); return }
      if (e.key === 's' || e.key === 'S') { onSkip(item.output.id); return }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [item, activeIndex, isFirst, isLast, isActing, onClose, onNext, onPrev, onApprove, onSkip, onEdit])

  if (!item) return null

  const body = (item.output.content as { body?: string }).body ?? ''

  return (
    <div
      className="flex flex-col bg-white border-l border-zinc-200 shadow-[-8px_0_24px_rgba(0,0,0,0.08)]"
      style={{ width: 920 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-100" style={{ padding: '16px 50px 14px' }}>
        {/* Meta row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium tracking-[0.04em] uppercase text-zinc-400">
            Reviewing {activeIndex + 1} of {total} this week
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-30 disabled:cursor-default"
              title="Previous (K)"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onNext}
              disabled={isLast}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-30 disabled:cursor-default"
              title="Next (J)"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-600 hover:bg-zinc-100"
              title="Close (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="text-[22px] font-semibold leading-snug tracking-[-0.02em] text-zinc-900">
          {item.output.title ?? body.slice(0, 80)}
        </p>

        {/* Channel + slot */}
        <div className="flex items-center gap-2.5 mt-2.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-[0.02em] uppercase bg-zinc-100 border border-zinc-200 text-zinc-500">
            {channelLabel(item)}
          </span>
          <span className="text-[12px] text-zinc-400">{formatSlot(item.suggestedSlot)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 50px 0' }}>
        <p className="text-[19px] leading-[1.85] text-zinc-800 whitespace-pre-wrap">{body}</p>

        {/* Keyboard hints */}
        <div className="flex items-center gap-4 mt-8 pt-5 border-t border-zinc-100 pb-6">
          {[
            { key: 'J', label: 'Next' },
            { key: 'K', label: 'Prev' },
            { key: 'A', label: 'Approve' },
            { key: 'E', label: 'Edit' },
            { key: 'Esc', label: 'Close' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-zinc-100 border border-zinc-200 border-b-2 rounded text-[10px] font-medium text-zinc-500">
                {key}
              </kbd>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 flex items-center gap-2 border-t border-zinc-100 bg-white"
        style={{ padding: '14px 50px' }}
      >
        <button
          onClick={() => onSkip(item.output.id)}
          disabled={isActing}
          className="h-[34px] px-3.5 rounded-lg border border-zinc-200 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          Skip
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onEdit(item.output.id)}
          disabled={isActing}
          className="h-[34px] px-3.5 rounded-lg bg-zinc-100 border border-zinc-200 text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-200 disabled:opacity-40"
        >
          Edit in Studio
        </button>
        <button
          onClick={() => onApprove(item.output.id, item.suggestedSlot)}
          disabled={isActing}
          className="h-[34px] px-3.5 rounded-lg bg-zinc-900 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 flex items-center gap-1.5"
        >
          {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
          Approve &amp; Queue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `PostDrawer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/inbox/PostDrawer.tsx
git commit -m "feat(inbox): add PostDrawer component"
```

---

## Task 3: Wire drawer into InboxPage and update PlanCard

**Files:**
- Modify: `app/(dashboard)/inbox/page.tsx`

Add drawer state, overlay + blur, updated `PlanCard` active styling, and channel badge on cards.

- [ ] **Step 1: Add drawer state and router import to `InboxPage`**

At the top of the file add the router import:

```ts
import { useRouter } from 'next/navigation'
```

Inside `InboxPage`, add these state variables after the existing state declarations:

```ts
const router = useRouter()
const [drawerIndex, setDrawerIndex] = useState<number | null>(null)
```

- [ ] **Step 2: Add `openDrawer`, `closeDrawer`, `handleDrawerApprove`, `handleDrawerSkip`, `handleDrawerEdit` handlers**

Add these inside `InboxPage` (after the existing `handleApproveWeek` function):

```ts
function openDrawer(index: number) {
  setDrawerIndex(index)
}

function closeDrawer() {
  setDrawerIndex(null)
}

async function handleDrawerApprove(id: string, scheduledAt: string | null) {
  // Capture current index and remaining count before state mutates
  const currentIndex = drawerIndex ?? 0
  const remainingCount = visible.length - 1 // one item will be removed
  await handleApproveSelected([id])
  setDrawerIndex(remainingCount === 0 ? null : Math.min(currentIndex, remainingCount - 1))
}

function handleDrawerSkip(id: string) {
  setSkipped((s) => new Set([...s, id]))
  closeDrawer()
}

function handleDrawerEdit(id: string) {
  router.push(`/studio?outputId=${id}`)
}
```

- [ ] **Step 3: Add `useEffect` for global keyboard shortcut to open drawer when closed**

Add this effect inside `InboxPage`:

```ts
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    if (drawerIndex !== null) return // drawer handles its own keys
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (e.key === 'j' || e.key === 'J') {
      setDrawerIndex((prev) => Math.min((prev ?? -1) + 1, visible.length - 1))
    }
    if (e.key === 'k' || e.key === 'K') {
      setDrawerIndex((prev) => Math.max((prev ?? 1) - 1, 0))
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [drawerIndex, visible])
```

- [ ] **Step 4: Update the return JSX to include the drawer**

Replace the outer `<div className="mx-auto max-w-2xl space-y-6">` wrapper with a full-height layout. Replace the entire `return (...)` in `InboxPage` with:

```tsx
return (
  <div className="relative flex h-full overflow-hidden">
    {/* List pane */}
    <div
      className={cn(
        'flex-1 overflow-y-auto transition-[filter] duration-200',
        drawerIndex !== null && 'blur-[3px]',
      )}
    >
      {/* Dim overlay — clicks close drawer */}
      {drawerIndex !== null && (
        <div
          className="absolute inset-0 z-10 bg-zinc-900/10"
          onClick={closeDrawer}
        />
      )}

      <div className="mx-auto max-w-2xl space-y-6 py-8 px-6">
        {/* Success panel */}
        {successCount !== null && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {successCount} post{successCount === 1 ? '' : 's'} queued for this week
            </span>
            <button onClick={() => setSuccessCount(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">This Week&apos;s Plan</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {loading ? 'Building your plan…' : `${visible.length} draft${visible.length === 1 ? '' : 's'} ready to review`}
            </p>
          </div>
          {!loading && visible.length > 0 && (
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={() => handleApproveSelected([...selected])}
                  disabled={anyActing}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
                >
                  {anyActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Approve {selected.size} selected
                </button>
              )}
              <button
                onClick={() => setShowConfirm(true)}
                disabled={anyActing}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40"
              >
                Approve Week
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Confirm panel */}
        {showConfirm && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-zinc-900">
              Queue all {visible.length} draft{visible.length === 1 ? '' : 's'} for this week?
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Each post will be scheduled at its suggested time slot. You can unschedule from the Queue page.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleApproveWeek}
                disabled={anyActing}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                {anyActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Confirm — Queue {visible.length} posts
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <CalendarClock className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">All caught up</p>
            <p className="mt-1 text-sm text-zinc-500">No drafts are ready for this week.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((item, index) => (
              <PlanCard
                key={item.output.id}
                item={item}
                isSelected={selected.has(item.output.id)}
                isActing={approvingIds.has(item.output.id)}
                anyActing={anyActing}
                isActive={drawerIndex === index}
                onToggle={() => toggleSelect(item.output.id)}
                onApprove={() => handleApproveSelected([item.output.id])}
                onSkip={() => setSkipped((s) => new Set([...s, item.output.id]))}
                onClick={() => openDrawer(index)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>

    {/* Drawer */}
    {drawerIndex !== null && (
      <PostDrawer
        items={visible}
        activeIndex={drawerIndex}
        isActing={anyActing}
        onClose={closeDrawer}
        onPrev={() => setDrawerIndex((i) => Math.max((i ?? 1) - 1, 0))}
        onNext={() => setDrawerIndex((i) => Math.min((i ?? 0) + 1, visible.length - 1))}
        onApprove={handleDrawerApprove}
        onSkip={handleDrawerSkip}
        onEdit={handleDrawerEdit}
      />
    )}
  </div>
)
```

- [ ] **Step 5: Add `PostDrawer` import at the top of `page.tsx`**

```ts
import { PostDrawer } from './PostDrawer'
```

- [ ] **Step 6: Update `PlanCard` props and component to support `isActive` and `onClick`, and show channel badge**

Replace the `PlanCard` function signature and component:

```tsx
function PlanCard({
  item, isSelected, isActing, anyActing, isActive, onToggle, onApprove, onSkip, onClick,
}: {
  item: WeeklyPlanItem
  isSelected: boolean
  isActing: boolean
  anyActing: boolean
  isActive: boolean
  onToggle: () => void
  onApprove: () => void
  onSkip: () => void
  onClick: () => void
}) {
  const { output, suggestedSlot } = item
  const channelName = output.channels?.label ?? output.channels?.platform ?? null

  return (
    <li
      className={cn(
        'relative rounded-xl border bg-white px-5 py-4 cursor-pointer transition-shadow hover:shadow-sm',
        isActive
          ? 'border-zinc-900 shadow-[0_0_0_1px_#18181b]'
          : isSelected
          ? 'border-zinc-400'
          : 'border-zinc-200',
      )}
      onClick={onClick}
    >
      {/* Active left accent bar */}
      {isActive && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-zinc-900" />
      )}

      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          disabled={anyActing}
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            isActive || isSelected
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 hover:border-zinc-500',
          )}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {(isActive || isSelected) && (
            <svg viewBox="0 0 8 6" className="h-2.5 w-2.5 fill-current">
              <path d="M1 3l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {output.title && (
            <p className="text-sm font-medium text-zinc-900 truncate">{output.title}</p>
          )}
          <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">{excerpt(output)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {channelName && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-[0.02em] uppercase bg-zinc-100 border border-zinc-200 text-zinc-500">
                {channelName}
              </span>
            )}
            <span className="text-xs text-zinc-400">{formatSlotPreview(suggestedSlot)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onSkip}
            disabled={anyActing}
            className="flex h-8 items-center rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-40"
          >
            Skip
          </button>
          <button
            onClick={onApprove}
            disabled={anyActing}
            className="flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Approve &amp; Queue
          </button>
        </div>
      </div>
    </li>
  )
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/\(dashboard\)/inbox/page.tsx app/\(dashboard\)/inbox/PostDrawer.tsx
git commit -m "feat(inbox): wire PostDrawer into InboxPage with active card styling"
```

---

## Task 4: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to `/inbox` and verify**

Check all of the following:

- Cards show channel badge (e.g. `LINKEDIN`, `NEWSLETTER`) next to the slot time
- Clicking a card slides the drawer in from the right at 920px width
- List behind drawer is blurred + dimmed; drawer itself is crisp
- Drawer shows correct title, channel badge, slot, full post body at 19px
- `Reviewing N of 6 this week` counter is accurate
- Prev/Next chevrons work; Prev is disabled on first post, Next on last
- Keyboard shortcuts work: J (next), K (prev), A (approve), E (edit → navigates to `/studio?outputId=...`), S/Esc (close)
- Approving a post from the drawer removes it from the list and advances to next (or closes if last)
- Clicking the dimmed list area closes the drawer
- Existing Approve & Queue and Skip buttons on cards still work
- Empty state appears correctly when all posts are approved/skipped

- [ ] **Step 3: Commit final**

```bash
git add -p
git commit -m "feat(inbox): post preview drawer — full post reading with keyboard nav"
```
