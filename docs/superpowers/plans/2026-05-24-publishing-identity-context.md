# Publishing Identity Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent `IdentityBar` component to studio, syndicate, and LinkedIn create pages so users always know which workspace they're generating as and which accounts they're publishing to.

**Architecture:** A single `IdentityBar` client component reads workspace context from `WorkspaceProvider` (no fetch needed) and fetches publishing accounts via a new `GET /api/publishing/accounts` endpoint. Account selection is persisted to `localStorage`. The bar is wired into three existing pages.

**Tech Stack:** Next.js 16 App Router, Radix Popover (reuses `WorkspaceSwitcher` popover), Supabase service client, Vitest (node env only)

**Prerequisite:** Phase 1 (Multi-Workspace Core) must be complete. `WorkspaceProvider` and `useWorkspace()` must be available.

---

## File Map

| File | Action |
|---|---|
| `app/api/publishing/accounts/route.ts` | Create — GET accounts for workspace |
| `hooks/use-publishing-accounts.ts` | Create |
| `components/publishing/identity-bar.tsx` | Create |
| `app/[workspaceSlug]/(dashboard)/studio/[id]/page.tsx` | Update — add IdentityBar |
| `app/[workspaceSlug]/(dashboard)/syndicate/page.tsx` | Update — add IdentityBar |
| `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx` | Update — replace account selector with IdentityBar |

---

## Task 1: Publishing accounts API endpoint

**Files:**
- Create: `app/api/publishing/accounts/route.ts`

- [ ] **Step 1: Understand the existing channel_credentials schema**

```bash
grep -n "channel_credentials\|channel_id\|account_name\|account_id" supabase/schema.sql | head -20
```

Note the column names. `channel_credentials` has: `id`, `channel_id`, `workspace_id`, `account_id`, `account_name`, `account_email`. `channels` has `platform`.

- [ ] **Step 2: Write the accounts endpoint**

Create `app/api/publishing/accounts/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export type PublishingAccount = {
  credentialId: string
  channelId: string
  platform: string
  accountId: string
  displayName: string
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: credentials } = await supabase
    .from('channel_credentials')
    .select('id, channel_id, account_id, account_name, channels(id, platform)')
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: true })

  const accounts: PublishingAccount[] = (credentials ?? []).map((c) => {
    const ch = c.channels as { id: string; platform: string } | null
    return {
      credentialId: c.id,
      channelId: ch?.id ?? c.channel_id,
      platform: ch?.platform ?? 'unknown',
      accountId: c.account_id ?? '',
      displayName: c.account_name ?? c.account_id ?? 'Account',
    }
  })

  return NextResponse.json({ accounts })
}
```

- [ ] **Step 3: Test endpoint manually**

```bash
npm run dev
# In another terminal, with your session cookie:
curl http://localhost:3000/api/publishing/accounts -H "Cookie: ..."
```

Expected: `{ "accounts": [...] }` with your connected accounts listed.

- [ ] **Step 4: Commit**

```bash
git add app/api/publishing/accounts/route.ts
git commit -m "feat: add GET /api/publishing/accounts endpoint"
```

---

## Task 2: usePublishingAccounts hook

**Files:**
- Create: `hooks/use-publishing-accounts.ts`

- [ ] **Step 1: Write the hook**

Create `hooks/use-publishing-accounts.ts`:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PublishingAccount } from '@/app/api/publishing/accounts/route'

export type { PublishingAccount }

const STORAGE_KEY = (workspaceId: string) => `clout-publishing-accounts-${workspaceId}`

export function usePublishingAccounts(workspaceId: string) {
  const [accounts, setAccounts] = useState<PublishingAccount[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/publishing/accounts')
      .then(r => r.ok ? r.json() : { accounts: [] })
      .then(d => {
        const accs: PublishingAccount[] = d.accounts ?? []
        setAccounts(accs)

        // Restore persisted selection, defaulting to all accounts selected
        const stored = localStorage.getItem(STORAGE_KEY(workspaceId))
        if (stored) {
          try {
            const parsed: string[] = JSON.parse(stored)
            // Only keep IDs that still exist in the account list
            const valid = parsed.filter(id => accs.some(a => a.credentialId === id))
            setSelected(new Set(valid))
          } catch {
            setSelected(new Set(accs.map(a => a.credentialId)))
          }
        } else {
          setSelected(new Set(accs.map(a => a.credentialId)))
        }
        setLoading(false)
      })
  }, [workspaceId])

  const toggle = useCallback((credentialId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(credentialId)) {
        next.delete(credentialId)
      } else {
        next.add(credentialId)
      }
      localStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify([...next]))
      return next
    })
  }, [workspaceId])

  // Group accounts by platform for display
  const byPlatform = accounts.reduce<Record<string, PublishingAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = []
    acc[a.platform].push(a)
    return acc
  }, {})

  return { accounts, selected, toggle, loading, byPlatform }
}
```

- [ ] **Step 2: Write test for grouping logic**

Create `hooks/__tests__/use-publishing-accounts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { PublishingAccount } from '../use-publishing-accounts'

function groupByPlatform(accounts: PublishingAccount[]): Record<string, PublishingAccount[]> {
  return accounts.reduce<Record<string, PublishingAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = []
    acc[a.platform].push(a)
    return acc
  }, {})
}

const ACCOUNTS: PublishingAccount[] = [
  { credentialId: 'c1', channelId: 'ch1', platform: 'linkedin', accountId: 'a1', displayName: 'Corporate' },
  { credentialId: 'c2', channelId: 'ch2', platform: 'linkedin', accountId: 'a2', displayName: 'CEO' },
  { credentialId: 'c3', channelId: 'ch3', platform: 'twitter', accountId: 'a3', displayName: '@amlon' },
]

describe('groupByPlatform', () => {
  it('groups accounts by platform', () => {
    const result = groupByPlatform(ACCOUNTS)
    expect(result['linkedin']).toHaveLength(2)
    expect(result['twitter']).toHaveLength(1)
  })

  it('returns empty object for no accounts', () => {
    expect(groupByPlatform([])).toEqual({})
  })
})
```

- [ ] **Step 3: Run test**

```bash
npx vitest run hooks/__tests__/use-publishing-accounts.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add hooks/use-publishing-accounts.ts hooks/__tests__/use-publishing-accounts.test.ts
git commit -m "feat: add usePublishingAccounts hook with localStorage persistence"
```

---

## Task 3: IdentityBar component

**Files:**
- Create: `components/publishing/identity-bar.tsx`

- [ ] **Step 1: Create the components directory if needed**

```bash
mkdir -p components/publishing
```

- [ ] **Step 2: Write IdentityBar**

Create `components/publishing/identity-bar.tsx`:

```tsx
'use client'

import { useWorkspace } from '@/components/providers/workspace-provider'
import { usePublishingAccounts } from '@/hooks/use-publishing-accounts'
import { useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  threads: 'Threads',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

type WorkspaceSwitcherData = {
  id: string
  name: string
  slug: string
  plan: string
  avatarUrl: string | null
  brandColor: string | null
}

export function IdentityBar({ outputId }: { outputId?: string }) {
  const workspace = useWorkspace()
  const { accounts, selected, toggle, loading, byPlatform } = usePublishingAccounts(workspace.id)
  const router = useRouter()
  const [workspacePopoverOpen, setWorkspacePopoverOpen] = useState(false)
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceSwitcherData[]>([])

  useEffect(() => {
    if (workspacePopoverOpen) {
      fetch('/api/workspaces')
        .then(r => r.ok ? r.json() : { workspaces: [] })
        .then(d => setAllWorkspaces(d.workspaces ?? []))
    }
  }, [workspacePopoverOpen])

  function switchWorkspace(slug: string) {
    document.cookie = `clout-active-workspace=${slug}; path=/; max-age=31536000; SameSite=Lax`
    setWorkspacePopoverOpen(false)
    router.push(`/${slug}/dashboard`)
  }

  const initials = workspace.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm">
      {/* Left: workspace identity */}
      <Popover.Root open={workspacePopoverOpen} onOpenChange={setWorkspacePopoverOpen}>
        <Popover.Trigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50 transition-colors">
            <div
              className="h-5 w-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              style={{ background: workspace.brandColor ?? '#18181b' }}
            >
              {initials}
            </div>
            <span className="font-medium text-zinc-900">{workspace.name}</span>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content side="bottom" align="start" sideOffset={4}
            className="z-50 w-52 rounded-lg border border-zinc-200 bg-white shadow-lg outline-none">
            <div className="p-1.5 space-y-0.5">
              {allWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.slug)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                    ws.slug === workspace.slug
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  )}
                >
                  <div
                    className="h-5 w-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    style={{ background: ws.brandColor ?? '#18181b' }}
                  >
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {ws.slug === workspace.slug && <Check className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div className="h-4 w-px bg-zinc-200" />

      {/* Right: publishing accounts */}
      {loading ? (
        <div className="h-4 w-48 animate-pulse rounded bg-zinc-100" />
      ) : accounts.length === 0 ? (
        <Link
          href={`/${workspace.slug}/settings/publishing`}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Connect accounts →
        </Link>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(byPlatform).map(([platform, platformAccounts]) => (
            <div key={platform} className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">
                {PLATFORM_LABELS[platform] ?? platform}:
              </span>
              {platformAccounts.map(account => (
                <label
                  key={account.credentialId}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(account.credentialId)}
                    onChange={() => toggle(account.credentialId)}
                    className="h-3 w-3 rounded border-zinc-300 accent-zinc-900"
                  />
                  <span className="text-xs text-zinc-600">{account.displayName}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify component renders in isolation**

Add it temporarily to any page and confirm it renders without errors:
```bash
npm run dev
```

Check browser console for errors. Remove the temporary addition when done.

- [ ] **Step 4: Commit**

```bash
git add components/publishing/identity-bar.tsx
git commit -m "feat: add IdentityBar component with workspace switcher and account toggles"
```

---

## Task 4: Wire IdentityBar into studio, syndicate, and LinkedIn create

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/studio/[id]/page.tsx`
- Modify: `app/[workspaceSlug]/(dashboard)/syndicate/page.tsx`
- Modify: `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx`

- [ ] **Step 1: Add IdentityBar to studio page**

Open `app/[workspaceSlug]/(dashboard)/studio/[id]/page.tsx`. Find the top-level layout — the area below the studio top bar. Import and add `IdentityBar` directly below the top bar and above the editor content:

```tsx
import { IdentityBar } from '@/components/publishing/identity-bar'

// In the JSX, below the top bar and above the editor:
<IdentityBar outputId={params.id} />
```

If the studio page is a server component, the `IdentityBar` is a client component so it can be imported directly — Next.js handles the boundary automatically.

- [ ] **Step 2: Add IdentityBar to syndicate page**

Open `app/[workspaceSlug]/(dashboard)/syndicate/page.tsx`. Find the URL input section. Add the bar above it:

```tsx
import { IdentityBar } from '@/components/publishing/identity-bar'

// Above the URL input:
<IdentityBar />
```

- [ ] **Step 3: Update LinkedIn create page**

Open `app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx`. Find the existing per-account selector. Replace it with `<IdentityBar />`. Remove the old account selector import and component.

- [ ] **Step 4: Verify all three pages**

```bash
npm run dev
```

1. Open `/{slug}/studio/[any-id]` — IdentityBar appears below top bar, shows workspace name and account checkboxes.
2. Open `/{slug}/syndicate` — IdentityBar appears above URL input.
3. Open `/{slug}/create/linkedin` — IdentityBar replaces old account selector.
4. Toggle an account checkbox — confirm state persists on page refresh (localStorage).
5. If you have multiple workspaces, use the workspace switcher in the IdentityBar — confirm redirect to `/{newSlug}/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/studio/[id]/page.tsx" "app/[workspaceSlug]/(dashboard)/syndicate/page.tsx" "app/[workspaceSlug]/(dashboard)/create/linkedin/page.tsx"
git commit -m "feat: wire IdentityBar into studio, syndicate, and LinkedIn create"
```
