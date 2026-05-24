# Workspace Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings left nav, settings Team page, slug editing with rate limit, workspace avatar, and brand color to the General section.

**Architecture:** A new `settings/layout.tsx` wraps all settings pages with a persistent left nav. The General page (`settings/workspace`) gains three new subsections (Identity, Plan, Danger Zone). A new `settings/team/page.tsx` handles member management and invite stubs. Slug editing calls the API routes built in Phase 1.

**Tech Stack:** Next.js 16 App Router, Supabase service client, `@radix-ui/react-dialog` (delete confirmation), Luxon (rate limit display), Vitest (node env only)

**Prerequisite:** Phase 1 (Multi-Workspace Core) must be complete. The routes now live at `app/[workspaceSlug]/(dashboard)/settings/`.

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/20260524_workspace_settings.sql` | Create — `workspace_invites` table |
| `supabase/schema.sql` | Update — add `workspace_invites` table |
| `types/db.ts` | Update — add `workspace_invites` Row/Insert types |
| `app/[workspaceSlug]/(dashboard)/settings/layout.tsx` | Create — settings left nav |
| `app/[workspaceSlug]/(dashboard)/settings/workspace/page.tsx` | Update — add avatar, brand color, slug UI, plan section, danger zone |
| `app/[workspaceSlug]/(dashboard)/settings/team/page.tsx` | Create — member list + invite form |
| `app/api/workspace/route.ts` | Update — add brand_color + avatar_url to PATCH |
| `app/api/workspace/avatar/route.ts` | Create — POST avatar upload |
| `app/api/workspace/invite/route.ts` | Create — POST invite, DELETE revoke |
| `app/api/workspace/members/[userId]/route.ts` | Create — PATCH role, DELETE remove |
| `app/api/workspace/team/route.ts` | Create — GET members + invites list |

---

## Task 1: workspace_invites migration

**Files:**
- Create: `supabase/migrations/20260524_workspace_settings.sql`
- Modify: `supabase/schema.sql`
- Modify: `types/db.ts`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260524_workspace_settings.sql`:

```sql
create table if not exists workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         workspace_role not null default 'editor',
  invited_by   uuid not null references users(id),
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

create index workspace_invites_workspace_idx on workspace_invites(workspace_id);
create index workspace_invites_email_idx on workspace_invites(email);

alter table workspace_invites enable row level security;

create policy "workspace_invites_select" on workspace_invites
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth_user_id()
    )
  );

create policy "workspace_invites_insert" on workspace_invites
  for insert with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth_user_id() and role in ('owner', 'admin')
    )
  );

create policy "workspace_invites_delete" on workspace_invites
  for delete using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth_user_id() and role in ('owner', 'admin')
    )
  );
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: No errors.

- [ ] **Step 3: Update `supabase/schema.sql`**

Append the `workspace_invites` table definition (same SQL) after the `workspace_members` block.

- [ ] **Step 4: Update `types/db.ts`**

Add `workspace_invites` to the Tables section:

```ts
workspace_invites: {
  Row: {
    accepted_at: string | null
    created_at: string
    email: string
    expires_at: string
    id: string
    invited_by: string
    role: Database['public']['Enums']['workspace_role']
    token: string
    workspace_id: string
  }
  Insert: {
    accepted_at?: string | null
    created_at?: string
    email: string
    expires_at?: string
    id?: string
    invited_by: string
    role?: Database['public']['Enums']['workspace_role']
    token?: string
    workspace_id: string
  }
  Update: {
    accepted_at?: string | null
    email?: string
    expires_at?: string
    id?: string
    invited_by?: string
    role?: Database['public']['Enums']['workspace_role']
    token?: string
    workspace_id?: string
  }
  Relationships: []
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260524_workspace_settings.sql supabase/schema.sql types/db.ts
git commit -m "feat: add workspace_invites table"
```

---

## Task 2: Settings layout (left nav)

**Files:**
- Create: `app/[workspaceSlug]/(dashboard)/settings/layout.tsx`

- [ ] **Step 1: Write settings layout**

Create `app/[workspaceSlug]/(dashboard)/settings/layout.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { cn } from '@/lib/utils'

const settingsNav = (slug: string) => [
  { label: 'General', href: `/${slug}/settings/workspace` },
  { label: 'Brand Identity', href: `/${slug}/settings/brand` },
  { label: 'Publishing', href: `/${slug}/settings/publishing` },
  { label: 'Signal Intelligence', href: `/${slug}/settings/feed` },
  { label: 'Team', href: `/${slug}/settings/team` },
  { label: 'Billing', href: `/${slug}/settings/billing` },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useWorkspace()
  const pathname = usePathname()
  const nav = settingsNav(slug)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your workspace configuration.</p>
      </div>
      <div className="flex gap-8">
        <nav className="w-44 shrink-0 space-y-0.5">
          {nav.map(({ label, href }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-100 font-medium text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify nav renders**

```bash
npm run dev
```

Navigate to `/{slug}/settings/workspace` — confirm the left nav appears with all 6 items. Click each link — confirm active state highlights correctly.

- [ ] **Step 3: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/layout.tsx"
git commit -m "feat: add settings left nav layout"
```

---

## Task 3: General settings page — identity, brand color, slug edit

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/workspace/page.tsx`
- Modify: `app/api/workspace/route.ts`

- [ ] **Step 1: Update workspace GET and PATCH API**

Open `app/api/workspace/route.ts`. In the `GET` handler, extend the select and also fetch subscription data:

```ts
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const [workspaceRes, membersRes, subRes] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug, plan, avatar_url, brand_color, slug_changed_at')
      .eq('id', session.workspaceId)
      .single(),
    supabase
      .from('workspace_members')
      .select('user_id, role', { count: 'exact' })
      .eq('workspace_id', session.workspaceId),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
  ])

  return NextResponse.json({
    workspace: workspaceRes.data,
    memberCount: membersRes.count ?? 0,
    userRole: membersRes.data?.find((m) => m.user_id === session.userId)?.role ?? 'viewer',
    subscription: subRes.data ?? null,
  })
}
```

In the `PATCH` handler, extend the update object:

```ts
const { data, error } = await supabase
  .from('workspaces')
  .update({
    ...(body.name?.trim() && { name: body.name.trim() }),
    ...(body.brand_color !== undefined && { brand_color: body.brand_color }),
    updated_at: new Date().toISOString(),
  })
  .eq('id', session.workspaceId)
  .select()
  .single()
```

Also update the `GET` handler to include `avatar_url`, `brand_color`, and `slug_changed_at` in the select:

```ts
supabase
  .from('workspaces')
  .select('id, name, slug, plan, avatar_url, brand_color, slug_changed_at')
  .eq('id', session.workspaceId)
  .single()
```

- [ ] **Step 2: Rewrite workspace settings page**

Replace `app/[workspaceSlug]/(dashboard)/settings/workspace/page.tsx` with:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { DateTime } from 'luxon'
import { cn } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'

type WorkspaceData = {
  id: string
  name: string
  slug: string
  plan: string
  avatar_url: string | null
  brand_color: string | null
  slug_changed_at: string | null
}

type SubscriptionData = {
  plan: string
  status: string
  current_period_end: string | null
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'rate_limited'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
}

export default function WorkspaceSettingsPage() {
  const activeWorkspace = useWorkspace()
  const router = useRouter()
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  // Identity form state
  const [name, setName] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Slug state
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugDaysLeft, setSlugDaysLeft] = useState<number | null>(null)
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  // Danger zone
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/workspace')
      .then(r => r.ok ? r.json() : null)
      .then((ws) => {
        if (ws?.workspace) {
          setData(ws.workspace)
          setName(ws.workspace.name ?? '')
          setBrandColor(ws.workspace.brand_color ?? '#18181b')
          setSlug(ws.workspace.slug ?? '')
          // Check rate limit
          if (ws.workspace.slug_changed_at) {
            const days = DateTime.now().diff(
              DateTime.fromISO(ws.workspace.slug_changed_at), 'days'
            ).days
            if (days < 30) setSlugDaysLeft(Math.ceil(30 - days))
          }
        }
        if (ws?.subscription) setSub(ws.subscription)
        setLoading(false)
      })
  }, [])

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug === data?.slug || slugDaysLeft !== null) return
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      const res = await fetch(`/api/workspace/slug-check?slug=${encodeURIComponent(slug)}`)
      if (res.ok) {
        const { available } = await res.json()
        setSlugStatus(available ? 'available' : 'taken')
      }
    }, 200)
    return () => clearTimeout(t)
  }, [slug, data?.slug, slugDaysLeft])

  const canEdit = activeWorkspace.userRole === 'owner' || activeWorkspace.userRole === 'admin'
  const isRateLimited = slugDaysLeft !== null

  async function handleSaveIdentity() {
    setSaving(true)
    await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brand_color: brandColor }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function handleSaveSlug() {
    setSlugSaving(true)
    setSlugError(null)
    const res = await fetch('/api/workspace/slug', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    if (res.ok) {
      const { slug: newSlug } = await res.json()
      router.replace(`/${newSlug}/settings/workspace`)
    } else {
      const d = await res.json()
      setSlugError(d.error ?? 'Failed to save')
    }
    setSlugSaving(false)
  }

  async function handleDelete() {
    if (deleteConfirm !== data?.slug) return
    setDeleting(true)
    const res = await fetch('/api/workspace', { method: 'DELETE' })
    if (res.ok) {
      router.push('/') // root redirect will find next workspace or /onboarding
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-lg border border-zinc-200 bg-zinc-50 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Identity */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Identity</h2>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Workspace name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Brand color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              disabled={!canEdit}
              className="h-8 w-8 rounded border border-zinc-200 cursor-pointer disabled:opacity-50"
            />
            <input
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              disabled={!canEdit}
              className="w-28 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-mono text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <button
          onClick={handleSaveIdentity}
          disabled={!canEdit || saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-800 transition-colors"
        >
          {saved ? 'Saved' : saving ? 'Saving...' : 'Save changes'}
        </button>
      </section>

      {/* Workspace URL */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Workspace URL</h2>
        <p className="text-xs text-zinc-500">
          This is your unique URL on Clout. Changing it will redirect old links for 30 days.
        </p>

        <div className={cn('flex items-center overflow-hidden rounded-md border', {
          'border-zinc-200 opacity-60': isRateLimited || !canEdit,
          'border-zinc-300': !isRateLimited && canEdit && slugStatus === 'idle',
          'border-emerald-400': slugStatus === 'available',
          'border-red-400': slugStatus === 'taken',
        })}>
          <span className="border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 whitespace-nowrap">
            clout.so/
          </span>
          <input
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugStatus('idle') }}
            disabled={isRateLimited || !canEdit}
            className="flex-1 px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none bg-white disabled:bg-zinc-50"
          />
          {!isRateLimited && canEdit && (
            <button
              onClick={handleSaveSlug}
              disabled={slugSaving || slugStatus !== 'available' || slug === data?.slug}
              className="border-l border-zinc-200 px-4 py-2 text-sm font-medium bg-zinc-900 text-white disabled:bg-zinc-200 disabled:text-zinc-400"
            >
              Save
            </button>
          )}
        </div>

        {slug !== data?.slug && !isRateLimited && (
          <div className="flex items-center gap-1.5">
            {slugStatus === 'available' && (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-500">{slug} is available</span>
                {data?.slug_changed_at && (
                  <span className="ml-auto text-xs text-zinc-400">
                    Last changed {DateTime.fromISO(data.slug_changed_at).toRelativeCalendar()}
                  </span>
                )}
              </>
            )}
            {slugStatus === 'taken' && (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-xs text-red-600">{slug} is already taken</span>
              </>
            )}
            {slugStatus === 'checking' && (
              <span className="text-xs text-zinc-400">Checking...</span>
            )}
          </div>
        )}

        {isRateLimited && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
            <span className="text-base leading-none">⏳</span>
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Slug changed {30 - (slugDaysLeft ?? 30)} days ago
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                You can change your slug again in <strong>{slugDaysLeft} day{slugDaysLeft === 1 ? '' : 's'}</strong>.
                Slugs are locked for 30 days to protect existing links.
              </p>
            </div>
          </div>
        )}

        {slugError && <p className="text-xs text-red-600">{slugError}</p>}
      </section>

      {/* Plan */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Plan</h2>
        <p className="text-sm text-zinc-500 capitalize">
          {sub?.plan ?? activeWorkspace.plan} plan
          {sub?.current_period_end && (
            <span className="text-zinc-400">
              {' '}· Renews {DateTime.fromISO(sub.current_period_end).toLocaleString(DateTime.DATE_MED)}
            </span>
          )}
        </p>
        <a
          href={`/${activeWorkspace.slug}/settings/billing`}
          className="text-xs font-medium text-zinc-600 underline"
        >
          Manage billing →
        </a>
      </section>

      {/* Danger zone */}
      {activeWorkspace.userRole === 'owner' && (
        <section className="rounded-lg border border-red-200 bg-white p-6 space-y-3">
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="text-xs text-zinc-500">
            Permanently deletes this workspace, all its content, and all member access. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete workspace
          </button>
        </section>
      )}

      {/* Delete confirmation dialog */}
      <Dialog.Root open={showDelete} onOpenChange={setShowDelete}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-base font-semibold text-zinc-900 mb-2">
              Delete workspace
            </Dialog.Title>
            <p className="text-sm text-zinc-500 mb-4">
              This will permanently delete <strong>{data?.name}</strong> and all its data.
              Type <strong>{data?.slug}</strong> to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={data?.slug}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-mono mb-4 focus:border-zinc-400 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== data?.slug || deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete workspace'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
```

- [ ] **Step 3: Add DELETE to workspace API**

In `app/api/workspace/route.ts`, add a `DELETE` handler:

```ts
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Only owner can delete
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can delete this workspace' }, { status: 403 })
  }

  await supabase
    .from('workspaces')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', session.workspaceId)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Verify settings page**

```bash
npm run dev
```

Navigate to `/{slug}/settings/workspace`. Verify: name field, brand color picker, slug field with all three states (try changing to taken slug, try changing to available slug), plan section, danger zone for owner.

- [ ] **Step 5: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/workspace/page.tsx" app/api/workspace/route.ts
git commit -m "feat: workspace general settings — identity, slug edit, plan section, danger zone"
```

---

## Task 4: Team page

**Files:**
- Create: `app/[workspaceSlug]/(dashboard)/settings/team/page.tsx`
- Create: `app/api/workspace/invite/route.ts`
- Create: `app/api/workspace/members/[userId]/route.ts`

- [ ] **Step 1: Write member and invite API routes**

Create `app/api/workspace/members/[userId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId: targetUserId } = await params

  const supabase = createServiceClient()
  const { data: actor } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!actor || actor.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
  }
  if (targetUserId === session.userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const body = await req.json()
  const newRole = body.role
  if (!['admin', 'editor', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', targetUserId)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId: targetUserId } = await params

  const supabase = createServiceClient()
  const { data: actor } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (targetUserId === session.userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', targetUserId)

  return NextResponse.json({ ok: true })
}
```

Create `app/api/workspace/invite/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: actor } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const email = body.email?.trim().toLowerCase()
  const role = body.role ?? 'editor'

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error } = await supabase.from('workspace_invites').insert({
    workspace_id: session.workspaceId,
    email,
    role,
    invited_by: session.userId,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email already has a pending invite' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const inviteId = url.searchParams.get('id')
  if (!inviteId) return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId)
    .eq('workspace_id', session.workspaceId)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write Team page**

Create `app/[workspaceSlug]/(dashboard)/settings/team/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/providers/workspace-provider'

type Member = {
  userId: string
  fullName: string | null
  email: string
  role: string
  joinedAt: string
}

type Invite = {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

const ROLE_ORDER = ['owner', 'admin', 'editor', 'viewer'] as const
const INVITABLE_ROLES = ['admin', 'editor', 'viewer'] as const

export default function TeamPage() {
  const workspace = useWorkspace()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const canManage = workspace.userRole === 'owner' || workspace.userRole === 'admin'

  function load() {
    fetch('/api/workspace/team')
      .then(r => r.ok ? r.json() : { members: [], invites: [] })
      .then(d => {
        setMembers(d.members ?? [])
        setInvites(d.invites ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    const res = await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    if (res.ok) {
      setInviteEmail('')
      load()
    } else {
      const d = await res.json()
      setInviteError(d.error ?? 'Failed to send invite')
    }
    setInviting(false)
  }

  async function handleRoleChange(userId: string, role: string) {
    await fetch(`/api/workspace/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member?')) return
    await fetch(`/api/workspace/members/${userId}`, { method: 'DELETE' })
    load()
  }

  async function handleRevoke(inviteId: string) {
    await fetch(`/api/workspace/invite?id=${inviteId}`, { method: 'DELETE' })
    load()
  }

  if (loading) {
    return <div className="h-48 rounded-lg border border-zinc-200 bg-zinc-50 animate-pulse" />
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {canManage && (
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Invite member</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            >
              {INVITABLE_ROLES.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Send invite
            </button>
          </form>
          {inviteError && <p className="mt-2 text-xs text-red-600">{inviteError}</p>}
        </section>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">
            Members <span className="text-zinc-400 font-normal ml-1">({members.length})</span>
          </h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-3 px-6 py-3">
              <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0">
                {(m.fullName ?? m.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{m.fullName ?? m.email}</p>
                <p className="text-xs text-zinc-400 truncate">{m.email}</p>
              </div>
              {workspace.userRole === 'owner' && m.role !== 'owner' ? (
                <select
                  value={m.role}
                  onChange={e => handleRoleChange(m.userId, e.target.value)}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none"
                >
                  {['admin', 'editor', 'viewer'].map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 capitalize">
                  {m.role}
                </span>
              )}
              {canManage && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.userId)}
                  className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {invites.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Pending invites</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-6 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700 truncate">{inv.email}</p>
                  <p className="text-xs text-zinc-400">
                    {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add GET /api/workspace/team route**

Create `app/api/workspace/team/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const [{ data: memberships }, { data: invites }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, joined_at, users(id, full_name, email)')
      .eq('workspace_id', session.workspaceId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('workspace_invites')
      .select('id, email, role, created_at, expires_at')
      .eq('workspace_id', session.workspaceId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const members = (memberships ?? []).map((m) => {
    const u = m.users as { id: string; full_name: string | null; email: string } | null
    return {
      userId: u?.id ?? '',
      fullName: u?.full_name ?? null,
      email: u?.email ?? '',
      role: m.role,
      joinedAt: m.joined_at,
    }
  })

  return NextResponse.json({ members, invites: invites ?? [] })
}
```

- [ ] **Step 4: Verify team page**

```bash
npm run dev
```

Navigate to `/{slug}/settings/team`. Verify: member list shows, invite form works (creates a record), revoke removes the invite.

- [ ] **Step 5: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/team/page.tsx" app/api/workspace/invite/route.ts "app/api/workspace/members/[userId]/route.ts" app/api/workspace/team/route.ts
git commit -m "feat: workspace team settings — member list, role management, invite stubs"
```
