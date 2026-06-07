# Saved Custom Audiences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist custom audience strings per workspace and display them as selectable pills in both the LinkedIn and Instagram create modes.

**Architecture:** A new `custom_audiences text[]` column on the `workspaces` table stores saved audiences. A shared `saveCustomAudience` helper (fire-and-forget, called from the generate routes) handles title-casing and dedup before writing. Both strategy panel components receive a `savedAudiences` prop and render the saved values as pills between the standard audience options and the "Custom…" pill. Selecting a saved pill sets `audience: 'custom'` and pre-fills `customAudience`.

**Tech Stack:** Next.js App Router (server components for pages), Supabase (service client), TypeScript, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260604002_custom_audiences.sql` | Create | Add `custom_audiences` column to `workspaces` |
| `lib/audiences.ts` | Create | `toTitleCase` util + `saveCustomAudience` helper |
| `tests/audiences/toTitleCase.test.ts` | Create | Unit tests for `toTitleCase` |
| `app/api/workspace/route.ts` | Modify | Add `custom_audiences` to GET select |
| `app/api/linkedin/generate/route.ts` | Modify | Fire-and-forget `saveCustomAudience` on custom audience |
| `app/api/instagram/generate/route.ts` | Modify | Fire-and-forget `saveCustomAudience` on custom audience |
| `components/linkedin/StrategyPanel.tsx` | Modify | Accept `savedAudiences` prop, render saved pills |
| `components/instagram/InstagramStrategyPanel.tsx` | Modify | Accept `savedAudiences` prop, render saved pills |
| `components/linkedin/LinkedInWorkspace.tsx` | Modify | Accept + thread `savedAudiences` to StrategyPanel |
| `components/instagram/InstagramWorkspace.tsx` | Modify | Accept + thread `savedAudiences` to InstagramStrategyPanel |
| `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx` | Modify | Fetch `custom_audiences`, pass to LinkedInWorkspace |
| `app/[workspaceSlug]/(dashboard)/create/instagram/page.tsx` | Modify | Fetch `custom_audiences`, pass to InstagramWorkspace |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260604002_custom_audiences.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260604002_custom_audiences.sql
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS custom_audiences text[] DEFAULT '{}';
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied without errors. If running locally: `npx supabase migration up`.

- [ ] **Step 3: Regenerate DB types**

```bash
npx supabase gen types typescript --local > types/db.ts
```

Verify `types/db.ts` now includes `custom_audiences: string[] | null` (or `string[]`) in the `workspaces` Row type.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604002_custom_audiences.sql types/db.ts
git commit -m "feat: add custom_audiences column to workspaces"
```

---

## Task 2: `toTitleCase` utility + `saveCustomAudience` helper

**Files:**
- Create: `lib/audiences.ts`
- Create: `tests/audiences/toTitleCase.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/audiences/toTitleCase.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toTitleCase } from '@/lib/audiences'

describe('toTitleCase', () => {
  it('capitalizes first letter of each word', () => {
    expect(toTitleCase('b2b saas founders')).toBe('B2b Saas Founders')
  })

  it('leaves already-capitalized words unchanged', () => {
    expect(toTitleCase('Enterprise Buyers')).toBe('Enterprise Buyers')
  })

  it('handles mixed case input', () => {
    expect(toTitleCase('DTC founders scaling past $1M')).toBe('DTC Founders Scaling Past $1M')
  })

  it('trims leading and trailing whitespace', () => {
    expect(toTitleCase('  early stage founders  ')).toBe('Early Stage Founders')
  })

  it('handles single word', () => {
    expect(toTitleCase('recruiters')).toBe('Recruiters')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/audiences/toTitleCase.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/audiences'"

- [ ] **Step 3: Implement `lib/audiences.ts`**

```ts
import { createServiceClient } from '@/lib/supabase/service'

export function toTitleCase(text: string): string {
  return text.trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function saveCustomAudience(
  workspaceId: string,
  rawText: string,
): Promise<void> {
  const value = toTitleCase(rawText)
  if (!value) return

  const supabase = createServiceClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('custom_audiences')
    .eq('id', workspaceId)
    .single()

  const existing: string[] = workspace?.custom_audiences ?? []
  const alreadySaved = existing.some(
    (a) => a.toLowerCase() === value.toLowerCase(),
  )
  if (alreadySaved) return

  await supabase
    .from('workspaces')
    .update({ custom_audiences: [...existing, value] })
    .eq('id', workspaceId)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/audiences/toTitleCase.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/audiences.ts tests/audiences/toTitleCase.test.ts
git commit -m "feat: toTitleCase utility and saveCustomAudience helper"
```

---

## Task 3: Expose `custom_audiences` from workspace GET

**Files:**
- Modify: `app/api/workspace/route.ts:10-15`

- [ ] **Step 1: Update the select list**

In `app/api/workspace/route.ts`, find the workspace query inside `GET()`:

```ts
// Before
supabase
  .from('workspaces')
  .select('id, name, slug, plan, avatar_url, brand_color, slug_changed_at')
  .eq('id', session.workspaceId)
  .single(),
```

Change to:

```ts
// After
supabase
  .from('workspaces')
  .select('id, name, slug, plan, avatar_url, brand_color, slug_changed_at, custom_audiences')
  .eq('id', session.workspaceId)
  .single(),
```

- [ ] **Step 2: Commit**

```bash
git add app/api/workspace/route.ts
git commit -m "feat: include custom_audiences in workspace GET response"
```

---

## Task 4: Fire-and-forget save in LinkedIn generate route

**Files:**
- Modify: `app/api/linkedin/generate/route.ts:63-76`

- [ ] **Step 1: Add the import and the save call**

At the top of `app/api/linkedin/generate/route.ts`, add the import after the existing imports:

```ts
import { saveCustomAudience } from '@/lib/audiences'
```

Then, just before the `return new Response(stream, ...)` line at the end of the function, add:

```ts
  if (request.audience === 'custom' && request.customAudience?.trim()) {
    saveCustomAudience(session.workspaceId, request.customAudience).catch(() => {
      // non-fatal — do not block generation
    })
  }

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
```

The full end of the function should look like:

```ts
  const ctx = { request, lenses: resolvedLenses }
  const stream = runLinkedInGeneration(ctx)

  if (request.audience === 'custom' && request.customAudience?.trim()) {
    saveCustomAudience(session.workspaceId, request.customAudience).catch(() => {})
  }

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
```

- [ ] **Step 2: Commit**

```bash
git add app/api/linkedin/generate/route.ts
git commit -m "feat: save custom audience on LinkedIn generation"
```

---

## Task 5: Fire-and-forget save in Instagram generate route

**Files:**
- Modify: `app/api/instagram/generate/route.ts:60-72`

- [ ] **Step 1: Add the import and the save call**

At the top of `app/api/instagram/generate/route.ts`, add the import after the existing imports:

```ts
import { saveCustomAudience } from '@/lib/audiences'
```

Then replace the end of the function to match this pattern (same as Task 4):

```ts
  const ctx = { request, lenses: resolvedLenses }
  const stream = runInstagramGeneration(ctx)

  if (request.audience === 'custom' && request.customAudience?.trim()) {
    saveCustomAudience(session.workspaceId, request.customAudience).catch(() => {})
  }

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
```

- [ ] **Step 2: Commit**

```bash
git add app/api/instagram/generate/route.ts
git commit -m "feat: save custom audience on Instagram generation"
```

---

## Task 6: Add saved audience pills to LinkedIn StrategyPanel

**Files:**
- Modify: `components/linkedin/StrategyPanel.tsx`

- [ ] **Step 1: Update the props interface**

In `components/linkedin/StrategyPanel.tsx`, find `StrategyPanelProps` and add the new prop:

```ts
interface StrategyPanelProps {
  values: Partial<LinkedInGenerationRequest>
  lenses: Lens[]
  onChange: (patch: Partial<LinkedInGenerationRequest>) => void
  canGenerate: boolean
  onGenerate: () => void
  readOnly?: boolean
  showGenerateButton?: boolean
  savedAudiences?: string[]
}
```

Update the function signature to destructure it:

```ts
export function StrategyPanel({
  values,
  lenses,
  onChange,
  canGenerate,
  onGenerate,
  readOnly,
  showGenerateButton,
  savedAudiences = [],
}: StrategyPanelProps) {
```

- [ ] **Step 2: Render saved audience pills**

In the Audience section, find the `{audiences.map(...)}` block (around line 163–175). The current structure is:

```tsx
<div className="flex flex-wrap gap-2">
  {audiences.map(item => (
    <Pill
      key={item.value}
      selected={values.audience === item.value}
      onClick={() => !readOnly && onChange({ audience: item.value, ...(item.value !== 'custom' && { customAudience: undefined }) })}
      disabled={readOnly}
    >
      {item.label}
    </Pill>
  ))}
</div>
```

Replace with:

```tsx
<div className="flex flex-wrap gap-2">
  {audiences.filter(item => item.value !== 'custom').map(item => (
    <Pill
      key={item.value}
      selected={values.audience === item.value}
      onClick={() => !readOnly && onChange({ audience: item.value, customAudience: undefined })}
      disabled={readOnly}
    >
      {item.label}
    </Pill>
  ))}
  {savedAudiences.map(saved => (
    <Pill
      key={saved}
      selected={values.audience === 'custom' && values.customAudience === saved}
      onClick={() => !readOnly && onChange({ audience: 'custom', customAudience: saved })}
      disabled={readOnly}
    >
      {saved}
    </Pill>
  ))}
  <Pill
    selected={values.audience === 'custom' && !savedAudiences.some(s => s === values.customAudience)}
    onClick={() => !readOnly && onChange({ audience: 'custom', customAudience: '' })}
    disabled={readOnly}
  >
    Custom…
  </Pill>
</div>
```

The "Custom…" pill is extracted from the `audiences.map()` and rendered last manually, so the visual order is: standard options → saved pills → Custom…. Clicking "Custom…" clears `customAudience` so the empty text input appears. Clicking a saved pill pre-fills `customAudience` with the saved value and the text input remains visible (pre-filled) for editing.

- [ ] **Step 3: Commit**

```bash
git add components/linkedin/StrategyPanel.tsx
git commit -m "feat: render saved audience pills in LinkedIn StrategyPanel"
```

---

## Task 7: Add saved audience pills to Instagram InstagramStrategyPanel

**Files:**
- Modify: `components/instagram/InstagramStrategyPanel.tsx`

- [ ] **Step 1: Update the props interface**

In `components/instagram/InstagramStrategyPanel.tsx`, find `InstagramStrategyPanelProps` and add:

```ts
interface InstagramStrategyPanelProps {
  values: Partial<InstagramGenerationRequest>
  lenses: Lens[]
  onChange: (patch: Partial<InstagramGenerationRequest>) => void
  canGenerate: boolean
  onGenerate: () => void
  readOnly?: boolean
  showGenerateButton?: boolean
  savedAudiences?: string[]
}
```

Update the function signature:

```ts
export function InstagramStrategyPanel({
  values,
  lenses,
  onChange,
  canGenerate,
  onGenerate,
  readOnly,
  showGenerateButton,
  savedAudiences = [],
}: InstagramStrategyPanelProps) {
```

- [ ] **Step 2: Render saved audience pills**

Find the Audience `<div className="flex flex-wrap gap-2">` block (around line 139–155). Replace with:

```tsx
<div className="flex flex-wrap gap-2">
  {audiences.filter((item) => item.value !== 'custom').map((item) => (
    <Pill
      key={item.value}
      selected={values.audience === item.value}
      onClick={() => !readOnly && onChange({ audience: item.value, customAudience: undefined })}
      disabled={readOnly}
    >
      {item.label}
    </Pill>
  ))}
  {savedAudiences.map((saved) => (
    <Pill
      key={saved}
      selected={values.audience === 'custom' && values.customAudience === saved}
      onClick={() => !readOnly && onChange({ audience: 'custom', customAudience: saved })}
      disabled={readOnly}
    >
      {saved}
    </Pill>
  ))}
  <Pill
    selected={values.audience === 'custom' && !savedAudiences.some(s => s === values.customAudience)}
    onClick={() => !readOnly && onChange({ audience: 'custom', customAudience: '' })}
    disabled={readOnly}
  >
    Custom…
  </Pill>
</div>
```

Same pattern as Task 6: standard pills → saved pills → Custom… (manually rendered last).

- [ ] **Step 3: Commit**

```bash
git add components/instagram/InstagramStrategyPanel.tsx
git commit -m "feat: render saved audience pills in Instagram strategy panel"
```

---

## Task 8: Thread `savedAudiences` through LinkedInWorkspace

**Files:**
- Modify: `components/linkedin/LinkedInWorkspace.tsx`

- [ ] **Step 1: Update `LinkedInWorkspaceProps` and pass the prop through**

In `components/linkedin/LinkedInWorkspace.tsx`, find `LinkedInWorkspaceProps`:

```ts
// Before
interface LinkedInWorkspaceProps {
  lenses: Lens[]
}
```

Change to:

```ts
// After
interface LinkedInWorkspaceProps {
  lenses: Lens[]
  savedAudiences?: string[]
}
```

Update the function signature destructuring to include `savedAudiences`:

```ts
export function LinkedInWorkspace({ lenses, savedAudiences = [] }: LinkedInWorkspaceProps) {
```

Find the `<StrategyPanel` usage in the JSX (it will be in the rendered layout) and add the prop:

```tsx
<StrategyPanel
  values={request}
  lenses={lenses}
  onChange={(patch) => setRequest((r) => ({ ...r, ...patch }))}
  canGenerate={canGenerate}
  onGenerate={handleGenerate}
  savedAudiences={savedAudiences}
/>
```

(Add `savedAudiences={savedAudiences}` — leave all other existing props unchanged.)

- [ ] **Step 2: Commit**

```bash
git add components/linkedin/LinkedInWorkspace.tsx
git commit -m "feat: thread savedAudiences through LinkedInWorkspace"
```

---

## Task 9: Thread `savedAudiences` through InstagramWorkspace

**Files:**
- Modify: `components/instagram/InstagramWorkspace.tsx`

- [ ] **Step 1: Update `InstagramWorkspaceProps` and thread the prop**

In `components/instagram/InstagramWorkspace.tsx`, find `InstagramWorkspaceProps`:

```ts
// Before
interface InstagramWorkspaceProps {
  lenses: Lens[]
}
```

Change to:

```ts
// After
interface InstagramWorkspaceProps {
  lenses: Lens[]
  savedAudiences?: string[]
}
```

Update the function signature:

```ts
export function InstagramWorkspace({ lenses, savedAudiences = [] }: InstagramWorkspaceProps) {
```

Find the `<InstagramStrategyPanel` usage in the JSX and add the prop:

```tsx
<InstagramStrategyPanel
  values={request}
  lenses={lenses}
  onChange={(patch) => setRequest((r) => ({ ...r, ...patch }))}
  canGenerate={canGenerate}
  onGenerate={handleGenerate}
  savedAudiences={savedAudiences}
/>
```

(Add `savedAudiences={savedAudiences}` — leave all other existing props unchanged.)

- [ ] **Step 2: Commit**

```bash
git add components/instagram/InstagramWorkspace.tsx
git commit -m "feat: thread savedAudiences through InstagramWorkspace"
```

---

## Task 10: Fetch and pass `savedAudiences` from the LinkedIn page

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx`

- [ ] **Step 1: Update the workspace query and pass the prop**

The current workspace query selects only `'id'`. Change it to also select `custom_audiences`:

```ts
// Before
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id')
  .eq('slug', workspaceSlug)
  .is('deleted_at', null)
  .maybeSingle()
```

```ts
// After
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id, custom_audiences')
  .eq('slug', workspaceSlug)
  .is('deleted_at', null)
  .maybeSingle()
```

Then pass it to `LinkedInWorkspace`:

```tsx
// Before
<LinkedInWorkspace lenses={lenses} />
```

```tsx
// After
<LinkedInWorkspace lenses={lenses} savedAudiences={workspace.custom_audiences ?? []} />
```

- [ ] **Step 2: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx"
git commit -m "feat: pass savedAudiences to LinkedIn create page"
```

---

## Task 11: Fetch and pass `savedAudiences` from the Instagram page

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/create/instagram/page.tsx`

- [ ] **Step 1: Update the workspace query and pass the prop**

Same change as Task 10 but for `InstagramCreatePage`. Update the workspace query:

```ts
// Before
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id')
  .eq('slug', workspaceSlug)
  .is('deleted_at', null)
  .maybeSingle()
```

```ts
// After
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id, custom_audiences')
  .eq('slug', workspaceSlug)
  .is('deleted_at', null)
  .maybeSingle()
```

Pass to `InstagramWorkspace`:

```tsx
// Before
<InstagramWorkspace lenses={lenses} />
```

```tsx
// After
<InstagramWorkspace lenses={lenses} savedAudiences={workspace.custom_audiences ?? []} />
```

- [ ] **Step 2: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/create/instagram/page.tsx"
git commit -m "feat: pass savedAudiences to Instagram create page"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass including `tests/audiences/toTitleCase.test.ts`

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Manually verify the flow**

1. Navigate to `/[your-workspace]/create/linkedin`
2. In the Audience section, click **Custom…**
3. Type `b2b saas founders scaling their team` in the text input
4. Fill in the other required fields (Source, Intent, Post Type) and click **Generate LinkedIn Post**
5. After generation completes, navigate away and back to the LinkedIn create page
6. Confirm a new pill labeled **"B2b Saas Founders Scaling Their Team"** appears in the Audience section between the standard pills and "Custom…"
7. Click the new pill — confirm it is selected (dark background) and the text input shows the pre-filled value
8. Repeat steps 2–7 on `/[your-workspace]/create/instagram` to verify the same behavior

- [ ] **Step 4: Verify deduplication**

Generate another LinkedIn post with the same custom audience text (any casing). Confirm only one pill exists (no duplicate).
