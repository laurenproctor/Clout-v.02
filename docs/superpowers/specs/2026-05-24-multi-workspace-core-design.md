# Multi-Workspace Core — Design Spec
**Date:** 2026-05-24  
**Status:** Approved  
**Build order:** Phase 1 — all other workspace specs depend on this

---

## Overview

Clout moves from a single-workspace model (user always lands on their first workspace) to a true multi-workspace system. One authenticated user can own and switch between multiple workspaces, each representing a distinct publishing identity. Every route becomes workspace-scoped via a URL slug segment. This spec covers the database additions, route architecture, workspace layout, session changes, middleware, workspace switcher UI, and create-workspace modal.

---

## Database Changes

### `workspaces` table — new columns

```sql
alter table workspaces
  add column if not exists avatar_url      text,
  add column if not exists brand_color     text,
  add column if not exists slug_changed_at timestamptz;
```

- `avatar_url` — optional image URL stored in Supabase Storage
- `brand_color` — hex string (e.g. `#18181b`), used in switcher and brand context
- `slug_changed_at` — timestamp of last slug change; drives the 30-day rate limit. Null means never changed (no restriction).

### New table: `workspace_slug_history`

```sql
create table workspace_slug_history (
  old_slug     text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  changed_at   timestamptz not null default now()
);

create index workspace_slug_history_workspace_idx
  on workspace_slug_history(workspace_id);

alter table workspace_slug_history enable row level security;

create policy "workspace_slug_history_select" on workspace_slug_history
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth_user_id()
    )
  );
```

Every slug change appends the old slug here. Middleware uses this table for 301 redirects when a user follows a stale link. Old slugs from deleted workspaces remain in the table indefinitely — they are never re-claimable.

---

## Route Architecture

### Before

```
app/
  (dashboard)/
    feed/page.tsx
    capture/page.tsx
    studio/[id]/page.tsx
    settings/workspace/page.tsx
    ...
```

URLs: `/feed`, `/studio/abc`, `/settings/workspace`

### After

```
app/
  [workspaceSlug]/
    layout.tsx                        ← workspace layout (server component)
    (dashboard)/
      layout.tsx                      ← existing shell layout (sidebar, nav) — unchanged
      feed/page.tsx
      capture/page.tsx
      studio/[id]/page.tsx
      settings/
        workspace/page.tsx
        brand/page.tsx
        publishing/page.tsx
        feed/page.tsx
        team/page.tsx                 ← new
        billing/page.tsx
      ...
```

URLs: `/amlon/feed`, `/amlon/studio/abc`, `/amlon/settings/workspace`

The `[workspaceSlug]` dynamic segment is a real Next.js route param — not a middleware rewrite. Every page and layout in the tree receives it via `params.workspaceSlug`.

All existing flat routes (`/feed`, `/dashboard`, etc.) are removed. Any inbound request to a flat path is redirected by middleware.

---

## Workspace Layout (Server Component)

**File:** `app/[workspaceSlug]/layout.tsx`

Responsibilities on every navigation:

1. Extract `workspaceSlug` from `params`
2. Call `getAuthenticatedUserId()` — resolve Clerk ID → internal user UUID
3. Query `workspaces` JOIN `workspace_members` WHERE `workspaces.slug = workspaceSlug AND workspace_members.user_id = userId AND workspaces.deleted_at IS NULL`
4. If user is not authenticated → redirect to `/sign-in`
5. If workspace not found → 404. (Middleware has already handled old-slug redirects before the layout runs — if the layout sees an unknown slug, it is genuinely invalid.)
6. If user has no membership for this workspace → redirect to their first workspace
7. Render `<WorkspaceProvider workspace={resolvedWorkspace}>{children}</WorkspaceProvider>`

The workspace object passed to the provider:
```ts
type Workspace = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'business' | 'enterprise'
  avatarUrl: string | null
  brandColor: string | null
  userRole: 'owner' | 'admin' | 'editor' | 'viewer'
}
```

---

## WorkspaceProvider

**File:** `components/providers/workspace-provider.tsx`

```tsx
'use client'

import { createContext, useContext } from 'react'

type Workspace = {
  id: string
  name: string
  slug: string
  plan: string
  avatarUrl: string | null
  brandColor: string | null
  userRole: string
}

const WorkspaceContext = createContext<Workspace | null>(null)

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace
  children: React.ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
```

The provider receives a fully resolved `Workspace` from the server layout. Client components call `useWorkspace()` — no async fetch, no loading state.

---

## Middleware

**File:** `middleware.ts`

Handles five cases on every request:

| Path | Action |
|---|---|
| `/` | 307 redirect to `/${firstWorkspaceSlug}/dashboard` |
| `/sign-in`, `/sign-up`, `/api/*`, `/onboarding` | Pass through unchanged |
| `/[slug]/...` where slug is current | Set `x-workspace-id` header; pass through |
| `/[slug]/...` where slug is in `workspace_slug_history` | 301 redirect to `/${currentSlug}/${rest}` |
| `/[slug]/...` where slug not found anywhere | 404 |

For the root redirect, middleware resolves the first workspace by reading a `clout-active-workspace` cookie (set on workspace switch). If the cookie is absent or stale, it falls back to a DB lookup for the user's first workspace ordered by `joined_at ASC`.

API routes stay at flat `/api/...` paths. Middleware sets the `x-workspace-id` header on every workspace-scoped request so API routes can read workspace context without parsing the URL.

---

## `getSession()` Changes

**File:** `lib/auth/session.ts`

The current function resolves a `workspaceId` by picking the user's first workspace. With URL-scoped routing, workspace resolution moves to the workspace layout. `getSession()` is simplified:

```ts
export interface AuthSession {
  clerkId: string
  userId: string
}

export async function getSession(): Promise<AuthSession | null>
```

API routes that need workspace context read `request.headers.get('x-workspace-id')` (injected by middleware). A helper:

```ts
// lib/auth/workspace-context.ts
export function getWorkspaceId(request: NextRequest): string | null {
  return request.headers.get('x-workspace-id')
}
```

---

## Slug Editing

### Rate limit

The 30-day rate limit is enforced server-side. On `PATCH /api/workspace/slug`:

```ts
if (workspace.slug_changed_at) {
  const daysSinceChange = differenceInDays(new Date(), new Date(workspace.slug_changed_at))
  if (daysSinceChange < 30) {
    return NextResponse.json({
      error: `Slug locked for ${30 - daysSinceChange} more days`
    }, { status: 429 })
  }
}
```

### Availability check

`GET /api/workspace/slug-check?slug=xxx`

Returns `{ available: boolean }`. Checks both `workspaces.slug` (current) and `workspace_slug_history.old_slug` (reserved). Old slugs from any workspace — including deleted ones — are never available.

### Slug change flow

On `PATCH /api/workspace/slug` (owner/admin only):
1. Validate rate limit
2. Check availability
3. Insert old slug into `workspace_slug_history`
4. Update `workspaces.slug` and `workspaces.slug_changed_at = NOW()`
5. Return new slug; client navigates to `/${newSlug}/settings/workspace`

### UI states

Three states rendered in the workspace settings slug field:

- **Available:** green dot, "amlongroup is available", Save enabled
- **Taken:** red dot, "acme is already taken", Save disabled
- **Rate limited:** field disabled, amber banner: "Slug changed 18 days ago — you can change again in 12 days (Jun 3). Slugs are locked for 30 days to protect existing links."

Availability is checked with a 200ms debounce on keyup.

---

## Workspace Switcher UI

**File:** `components/shell/workspace-switcher.tsx`

Replaces the current top area of the sidebar. Renders the active workspace name and avatar as a clickable trigger. On click, opens a Radix `Popover` with:

- Header: "Workspaces" label
- List of all workspaces the user belongs to (from `workspace_members` JOIN `workspaces`)
- Each item: avatar (initials fallback + `brand_color` background), name, plan badge
- Active workspace: dark background, checkmark
- Footer: "Create workspace" (triggers modal), "Workspace settings" link
- On workspace click: navigate to `/${newSlug}/dashboard`, set `clout-active-workspace` cookie

---

## Create Workspace Modal

Triggered from the switcher footer. Fields:

- **Name** — text input, required
- **Slug** — auto-generated from name (lowercase, hyphens), editable, real-time availability check

On submit:
1. `canCreateWorkspace(userId)` entitlements check (returns allowed in Phase 1 — enforcement deferred)
2. `INSERT INTO workspaces (name, slug) VALUES ($1, $2)`
3. `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`
4. Navigate to `/${newSlug}/dashboard`
5. Set `clout-active-workspace` cookie

---

## Existing User Migration

No DB migration required — existing users already have a workspace with a slug. When they hit the app post-deploy:

1. Middleware receives `GET /`
2. Reads or resolves their workspace slug
3. 307 redirects to `/${existingSlug}/dashboard`

Invisible to the user. The switcher appears in the sidebar showing their one existing workspace. They discover multi-workspace by clicking it and seeing "Create workspace."

---

## Link Prefix Convention

Every internal `Link` and `router.push` must prefix routes with the workspace slug. Pattern:

```tsx
const { slug } = useWorkspace()
<Link href={`/${slug}/feed`}>Signal Feed</Link>
```

The sidebar nav component, all in-app links, and all `router.push` calls in the `(dashboard)` tree must be updated.

---

## Files Changed / Created

| File | Action |
|---|---|
| `supabase/migrations/20260524_multi_workspace_core.sql` | New — DB additions |
| `app/[workspaceSlug]/layout.tsx` | New — workspace layout |
| `app/[workspaceSlug]/(dashboard)/...` | Move — all existing dashboard routes |
| `components/providers/workspace-provider.tsx` | New |
| `components/shell/workspace-switcher.tsx` | New |
| `components/shell/sidebar.tsx` | Update — add switcher, prefix links |
| `middleware.ts` | Update — slug resolution, cookie, redirects |
| `lib/auth/session.ts` | Update — remove workspaceId |
| `lib/auth/workspace-context.ts` | New — getWorkspaceId helper |
| `app/api/workspace/slug/route.ts` | New — PATCH slug endpoint |
| `app/api/workspace/slug-check/route.ts` | New — GET availability check |
