# Saved Custom Audiences

**Date:** 2026-06-04  
**Scope:** LinkedIn and Instagram create modes  
**Status:** Approved

## Problem

When a user enters a custom audience in a create mode (e.g. "B2B SaaS Founders Building Their First Sales Team"), that text is forgotten after the session. Every subsequent generation requires re-typing it. Custom audiences should persist per workspace and be selectable as pills on future visits.

## Database

### Migration

Add a column to the `workspaces` table:

```sql
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS custom_audiences text[] DEFAULT '{}';
```

No new table, no new RLS policies needed — workspace RLS already covers this column.

### Deduplication and title-casing

Before storing, the server:
1. Title-cases the input: every word's first letter is uppercased (`"b2b saas founders"` → `"B2B Saas Founders"`).
2. Deduplicates case-insensitively against the existing array — if the title-cased value already exists, skip the update.

## API

### Shared helper: `saveCustomAudience`

A new function in `lib/audiences.ts` (or similar):

```ts
saveCustomAudience(workspaceId: string, rawText: string): Promise<void>
```

- Title-cases `rawText`
- Fetches current `custom_audiences` for the workspace
- If the value is not already present (case-insensitive), appends it and updates the row
- Fire-and-forget from the generate routes (errors are non-fatal — do not block the generation response)

### Generate routes

Both `/api/linkedin/generate` and `/api/instagram/generate` call `saveCustomAudience` after a successful generation when `request.audience === 'custom'` and `request.customAudience` is non-empty. The save is async and does not block streaming.

### Workspace GET

`GET /api/workspace` adds `custom_audiences` to the select list so the UI receives saved audiences on page load.

## UI

### Data flow

```
Page (server or client fetch of /api/workspace)
  └── LinkedInWorkspace / InstagramWorkspace  [prop: savedAudiences: string[]]
        └── StrategyPanel / InstagramStrategyPanel  [prop: savedAudiences: string[]]
```

### Strategy panels

Both `StrategyPanel` (LinkedIn) and `InstagramStrategyPanel` accept a new optional prop:

```ts
savedAudiences?: string[]
```

In the Audience section, saved audiences are rendered as pills **between the last standard option and the "Custom…" pill**. They are visually identical to other audience pills.

**On click of a saved audience pill:**
- Sets `audience: 'custom'`
- Sets `customAudience` to the saved string
- The free-text input is hidden (value is already filled)

**On click of "Custom…" pill:**
- Existing behavior unchanged — sets `audience: 'custom'`, shows empty text input

**Text input visibility rule:**
- Show the text input when `audience === 'custom'` AND no saved pill is currently selected (i.e. `customAudience` is empty or the user cleared the input after clicking "Custom…" directly)
- Hide the text input when `audience === 'custom'` AND the value matches a saved pill exactly

Actually simpler: show the input whenever `audience === 'custom'` — pre-filled if a saved pill was clicked. This is consistent with existing behavior and lets the user edit a saved audience before generating.

## Constraints

- Max saved audiences per workspace: no hard limit enforced in this iteration (the list will be short in practice).
- Title-case is cosmetic only — the underlying stored value is the title-cased string.
- Custom audiences are shared across LinkedIn and Instagram (both panels read from the same `workspaces.custom_audiences` array).
- Saving is non-fatal: if the DB write fails, generation proceeds normally.

## Files to change

| File | Change |
|------|--------|
| `supabase/migrations/20260604002_custom_audiences.sql` | New migration adding `custom_audiences` column |
| `lib/audiences.ts` | New `saveCustomAudience` helper + `toTitleCase` util |
| `app/api/workspace/route.ts` | Add `custom_audiences` to GET select |
| `app/api/linkedin/generate/route.ts` | Call `saveCustomAudience` on successful generation |
| `app/api/instagram/generate/route.ts` | Call `saveCustomAudience` on successful generation |
| `components/linkedin/LinkedInWorkspace.tsx` | Accept + load `savedAudiences`, pass to StrategyPanel |
| `components/instagram/InstagramWorkspace.tsx` | Accept + load `savedAudiences`, pass to InstagramStrategyPanel |
| `components/linkedin/StrategyPanel.tsx` | Render saved audience pills, accept `savedAudiences` prop |
| `components/instagram/InstagramStrategyPanel.tsx` | Render saved audience pills, accept `savedAudiences` prop |
| `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx` | Pass `savedAudiences` to LinkedInWorkspace |
| `app/[workspaceSlug]/(dashboard)/create/instagram/page.tsx` | Pass `savedAudiences` to InstagramWorkspace |
