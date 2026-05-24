# Entitlements Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a centralized entitlements module with plan limits as typed constants, three async check functions, a lightweight API endpoint, and UI hooks — all wired but with permissive limits (99) so no user is blocked until billing is enforced.

**Architecture:** `lib/billing/entitlements.ts` defines constants and server-side check functions. `app/api/entitlements/route.ts` exposes them to the client. `hooks/use-entitlements.ts` provides React hooks for disabling buttons before the user attempts a gated action.

**Tech Stack:** Next.js 16 App Router, Supabase service client, Vitest (node env)

**Prerequisite:** Phase 1 (Multi-Workspace Core) must be complete — `getSession()` and `getWorkspaceSlug()` must be available.

---

## File Map

| File | Action |
|---|---|
| `lib/billing/entitlements.ts` | Create — plan limits + check functions |
| `lib/billing/__tests__/entitlements.test.ts` | Create — unit tests for check logic |
| `app/api/entitlements/route.ts` | Create — GET entitlements check endpoint |
| `hooks/use-entitlements.ts` | Create — React hooks for UI gating |

---

## Task 1: Entitlements module

**Files:**
- Create: `lib/billing/entitlements.ts`
- Create: `lib/billing/__tests__/entitlements.test.ts`

- [ ] **Step 1: Write entitlements.ts**

Create `lib/billing/entitlements.ts`:

```ts
import { createServiceClient } from '@/lib/supabase/service'

type PlanLimits = {
  workspaces: number
  channels:   number
  accounts:   number
  members:    number
}

// Free limits are permissive until billing is enforced.
// To activate: change free.workspaces to 1, free.accounts to 3, etc.
export const PLAN_LIMITS = {
  free: {
    workspaces: 99,
    channels:   99,
    accounts:   99,
    members:    99,
  },
  pro: {
    workspaces: 5,
    channels:   20,
    accounts:   20,
    members:    5,
  },
  business: {
    workspaces: 15,
    channels:   50,
    accounts:   50,
    members:    20,
  },
  enterprise: {
    workspaces: 99,
    channels:   99,
    accounts:   99,
    members:    99,
  },
} as const satisfies Record<string, PlanLimits>

// Future limits — defined as reference, not yet enforced
export const FUTURE_LIMITS = {
  ai_generations_per_month: { free: 20,  pro: 200,  business: 1000,  enterprise: 99999 },
  signal_sources:           { free: 3,   pro: 25,   business: 100,   enterprise: 99999 },
  analytics_retention_days: { free: 30,  pro: 180,  business: 365,   enterprise: 99999 },
} as const

export type EntitlementResult =
  | { allowed: true }
  | { allowed: false; reason: string; limit: number; current: number }

type Plan = keyof typeof PLAN_LIMITS

function resolvePlan(plan: string | null): Plan {
  if (plan && plan in PLAN_LIMITS) return plan as Plan
  return 'free'
}

// Compares count against limit. Returns a typed result.
function check(
  current: number,
  limit: number,
  resource: string
): EntitlementResult {
  if (current < limit) return { allowed: true }
  return {
    allowed: false,
    reason: `Your plan allows ${limit} ${resource}. Upgrade to add more.`,
    limit,
    current,
  }
}

// canCreateWorkspace: uses highest plan among owned workspaces
export async function canCreateWorkspace(userId: string): Promise<EntitlementResult> {
  const supabase = createServiceClient()

  // Count workspaces owned by this user
  const { count: ownedCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'owner')

  // Find highest plan among owned workspaces
  const { data: subs } = await supabase
    .from('workspace_members')
    .select('workspaces(subscriptions(plan))')
    .eq('user_id', userId)
    .eq('role', 'owner')

  const plans = (subs ?? []).flatMap((m) => {
    const ws = m.workspaces as { subscriptions: { plan: string }[] } | null
    return ws?.subscriptions?.map(s => s.plan) ?? []
  })

  const PLAN_ORDER: Plan[] = ['enterprise', 'business', 'pro', 'free']
  const highestPlan = PLAN_ORDER.find(p => plans.includes(p)) ?? 'free'
  const limit = PLAN_LIMITS[highestPlan].workspaces

  return check(ownedCount ?? 0, limit, 'workspace')
}

// canConnectAccount: checks against workspace's own plan
export async function canConnectAccount(workspaceId: string): Promise<EntitlementResult> {
  const supabase = createServiceClient()

  const [{ count: accountCount }, { data: sub }] = await Promise.all([
    supabase
      .from('channel_credentials')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
  ])

  const plan = resolvePlan(sub?.plan ?? null)
  const limit = PLAN_LIMITS[plan].accounts

  return check(accountCount ?? 0, limit, 'connected account')
}

// canInviteMember: checks against workspace's own plan
export async function canInviteMember(workspaceId: string): Promise<EntitlementResult> {
  const supabase = createServiceClient()

  const [{ count: memberCount }, { data: sub }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
  ])

  const plan = resolvePlan(sub?.plan ?? null)
  const limit = PLAN_LIMITS[plan].members

  return check(memberCount ?? 0, limit, 'member')
}
```

- [ ] **Step 2: Write unit tests for the pure logic**

Create `lib/billing/__tests__/entitlements.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS } from '../entitlements'

// Test the plan constants directly
describe('PLAN_LIMITS', () => {
  it('free plan is permissive', () => {
    expect(PLAN_LIMITS.free.workspaces).toBe(99)
    expect(PLAN_LIMITS.free.accounts).toBe(99)
    expect(PLAN_LIMITS.free.members).toBe(99)
  })

  it('pro plan has defined limits', () => {
    expect(PLAN_LIMITS.pro.workspaces).toBe(5)
    expect(PLAN_LIMITS.pro.accounts).toBe(20)
    expect(PLAN_LIMITS.pro.members).toBe(5)
  })

  it('enterprise plan is permissive', () => {
    expect(PLAN_LIMITS.enterprise.workspaces).toBe(99)
  })

  it('all plans have required keys', () => {
    for (const plan of Object.values(PLAN_LIMITS)) {
      expect(typeof plan.workspaces).toBe('number')
      expect(typeof plan.channels).toBe('number')
      expect(typeof plan.accounts).toBe('number')
      expect(typeof plan.members).toBe('number')
    }
  })
})

// Test the check helper in isolation
describe('check logic', () => {
  function check(current: number, limit: number, resource: string) {
    if (current < limit) return { allowed: true as const }
    return {
      allowed: false as const,
      reason: `Your plan allows ${limit} ${resource}. Upgrade to add more.`,
      limit,
      current,
    }
  }

  it('allows when under limit', () => {
    const result = check(2, 5, 'workspace')
    expect(result.allowed).toBe(true)
  })

  it('blocks when at limit', () => {
    const result = check(5, 5, 'workspace')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.limit).toBe(5)
      expect(result.current).toBe(5)
    }
  })

  it('blocks when over limit', () => {
    const result = check(6, 5, 'workspace')
    expect(result.allowed).toBe(false)
  })

  it('includes helpful reason message', () => {
    const result = check(5, 5, 'workspace')
    if (!result.allowed) {
      expect(result.reason).toContain('5 workspace')
      expect(result.reason).toContain('Upgrade')
    }
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run lib/billing/__tests__/entitlements.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/billing/entitlements.ts lib/billing/__tests__/entitlements.test.ts
git commit -m "feat: add entitlements module with plan limits and check functions"
```

---

## Task 2: Entitlements API endpoint

**Files:**
- Create: `app/api/entitlements/route.ts`

- [ ] **Step 1: Write the endpoint**

Create `app/api/entitlements/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getWorkspaceSlug } from '@/lib/auth/workspace-context'
import { createServiceClient } from '@/lib/supabase/service'
import {
  canCreateWorkspace,
  canConnectAccount,
  canInviteMember,
} from '@/lib/billing/entitlements'

type CheckName = 'createWorkspace' | 'connectAccount' | 'inviteMember'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const checkName = req.nextUrl.searchParams.get('check') as CheckName | null
  if (!checkName) return NextResponse.json({ error: 'check param required' }, { status: 400 })

  // Resolve workspaceId from the workspace slug in the header
  const workspaceSlug = getWorkspaceSlug(req)
  let workspaceId: string | null = null

  if (workspaceSlug) {
    const supabase = createServiceClient()
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', workspaceSlug)
      .is('deleted_at', null)
      .maybeSingle()
    workspaceId = ws?.id ?? null
  }

  let result
  switch (checkName) {
    case 'createWorkspace':
      result = await canCreateWorkspace(session.userId)
      break
    case 'connectAccount':
      if (!workspaceId) return NextResponse.json({ error: 'Workspace required' }, { status: 400 })
      result = await canConnectAccount(workspaceId)
      break
    case 'inviteMember':
      if (!workspaceId) return NextResponse.json({ error: 'Workspace required' }, { status: 400 })
      result = await canInviteMember(workspaceId)
      break
    default:
      return NextResponse.json({ error: 'Unknown check' }, { status: 400 })
  }

  return NextResponse.json({
    allowed: result.allowed,
    ...(!result.allowed ? { reason: result.reason, limit: result.limit, current: result.current } : {}),
  })
}
```

- [ ] **Step 2: Test endpoint manually**

```bash
# With dev server running:
curl "http://localhost:3000/api/entitlements?check=createWorkspace" -H "Cookie: ..."
```

Expected: `{ "allowed": true }` (limits are permissive at 99).

- [ ] **Step 3: Commit**

```bash
git add app/api/entitlements/route.ts
git commit -m "feat: add GET /api/entitlements endpoint"
```

---

## Task 3: UI hooks

**Files:**
- Create: `hooks/use-entitlements.ts`

- [ ] **Step 1: Write the hooks**

Create `hooks/use-entitlements.ts`:

```ts
'use client'

import { useState, useEffect } from 'react'

type CheckName = 'createWorkspace' | 'connectAccount' | 'inviteMember'

function useEntitlementCheck(check: CheckName): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`/api/entitlements?check=${check}`)
      .then(r => r.ok ? r.json() : { allowed: true })
      .then(d => setAllowed(d.allowed ?? true))
      .catch(() => setAllowed(true)) // fail open
  }, [check])

  return allowed
}

// Returns true if the user can create another workspace, null while loading.
export function useCanCreateWorkspace(): boolean | null {
  return useEntitlementCheck('createWorkspace')
}

// Returns true if the workspace can connect another account, null while loading.
export function useCanConnectAccount(): boolean | null {
  return useEntitlementCheck('connectAccount')
}

// Returns true if the workspace can invite another member, null while loading.
export function useCanInviteMember(): boolean | null {
  return useEntitlementCheck('inviteMember')
}
```

- [ ] **Step 2: Wire into workspace switcher create button**

Open `components/shell/workspace-switcher.tsx`. Import the hook:

```tsx
import { useCanCreateWorkspace } from '@/hooks/use-entitlements'
```

Inside `WorkspaceSwitcher`, call the hook:

```tsx
const canCreate = useCanCreateWorkspace()
```

Update the "Create workspace" button to respect the limit:

```tsx
<button
  onClick={() => { setOpen(false); setShowCreate(true) }}
  disabled={canCreate === false}
  title={canCreate === false ? 'Upgrade your plan to create more workspaces' : undefined}
  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
>
  <Plus className="h-4 w-4" />
  Create workspace
</button>
```

- [ ] **Step 3: Wire into team settings invite button**

Open `app/[workspaceSlug]/(dashboard)/settings/team/page.tsx`. Import and use:

```tsx
import { useCanInviteMember } from '@/hooks/use-entitlements'

// In the component:
const canInvite = useCanInviteMember()

// On the Send invite button, add:
disabled={inviting || canInvite === false}
title={canInvite === false ? 'Upgrade to invite more members' : undefined}
```

- [ ] **Step 4: Wire into publishing settings connect button**

Open `app/[workspaceSlug]/(dashboard)/settings/publishing/page.tsx`. Find the "Connect account" button (or equivalent OAuth trigger button). Import the hook:

```tsx
import { useCanConnectAccount } from '@/hooks/use-entitlements'

// In the component:
const canConnect = useCanConnectAccount()

// On the connect/add account button:
disabled={canConnect === false}
title={canConnect === false ? 'Upgrade your plan to connect more accounts' : undefined}
```

- [ ] **Step 5: Verify hooks in UI**

```bash
npm run dev
```

Since all limits are 99, no UI elements should be disabled. Confirm the hooks load without errors in the browser console.

To manually verify the hook disabling works, temporarily change `PLAN_LIMITS.free.workspaces` to `0` in `lib/billing/entitlements.ts`, reload, and confirm the "Create workspace" button is disabled. Revert after testing.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-entitlements.ts components/shell/workspace-switcher.tsx "app/[workspaceSlug]/(dashboard)/settings/team/page.tsx"
git commit -m "feat: add use-entitlements hooks and wire into workspace switcher and team settings"
```
