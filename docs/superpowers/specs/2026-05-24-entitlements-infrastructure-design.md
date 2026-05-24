# Entitlements Infrastructure — Design Spec
**Date:** 2026-05-24  
**Status:** Approved  
**Build order:** Phase 4 — depends on Multi-Workspace Core (Spec 1). Can build in parallel with Specs 2 and 3.

---

## Overview

A centralized entitlements module that defines plan limits as typed constants and exposes check functions used by both API routes and UI hooks. The infrastructure is fully wired in this phase but not enforced — limits are set permissively until Stripe billing is finalized in a future spec. Turning enforcement on requires changing one constant per limit.

---

## Plan Limits

**File:** `lib/billing/entitlements.ts`

```ts
export const PLAN_LIMITS = {
  free: {
    workspaces: 99,   // temporarily permissive — set to 1 when billing enforced
    channels:   99,   // temporarily permissive — set to 2 when billing enforced
    accounts:   99,   // temporarily permissive — set to 3 when billing enforced
    members:    99,   // temporarily permissive — set to 1 when billing enforced
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

type PlanLimits = {
  workspaces: number
  channels:   number
  accounts:   number
  members:    number
}
```

Future limits (defined here as constants, not yet checked):
```ts
// Defined for future use — not checked in Phase 4
export const FUTURE_LIMITS = {
  ai_generations_per_month: { free: 20, pro: 200, business: 1000, enterprise: 99999 },
  signal_sources:           { free: 3,  pro: 25,  business: 100,  enterprise: 99999 },
  analytics_retention_days: { free: 30, pro: 180, business: 365,  enterprise: 99999 },
}
```

---

## Check Functions

All check functions are async (they query the DB for current usage) and return a typed result:

```ts
type EntitlementResult =
  | { allowed: true }
  | { allowed: false; reason: string; limit: number; current: number }
```

### `canCreateWorkspace(userId: string): Promise<EntitlementResult>`

1. Look up user's current workspace count from `workspace_members` WHERE `role = 'owner'`
2. Look up plan from each of their owned workspaces' `subscriptions`; use the highest plan found (a user on Pro in one workspace gets Pro-level limits for workspace creation)
3. Compare count against `PLAN_LIMITS[highestPlan].workspaces`

### `canConnectAccount(workspaceId: string): Promise<EntitlementResult>`

1. Count `channel_credentials` WHERE `workspace_id = workspaceId`
2. Look up plan from `subscriptions` WHERE `workspace_id = workspaceId`
3. Compare against `PLAN_LIMITS[plan].accounts`

### `canInviteMember(workspaceId: string): Promise<EntitlementResult>`

1. Count `workspace_members` WHERE `workspace_id = workspaceId`
2. Look up plan
3. Compare against `PLAN_LIMITS[plan].members`

---

## API Usage Pattern

In API routes that create gated resources:

```ts
import { canCreateWorkspace } from '@/lib/billing/entitlements'

// In POST /api/workspaces
const check = await canCreateWorkspace(session.userId)
if (!check.allowed) {
  return NextResponse.json(
    { error: check.reason, limit: check.limit, current: check.current },
    { status: 403 }
  )
}
```

---

## UI Hook

**File:** `hooks/use-entitlements.ts`

```ts
export function useCanCreateWorkspace(): boolean | null  // null = loading
export function useCanConnectAccount(): boolean | null
export function useCanInviteMember(): boolean | null
```

Each hook calls `GET /api/entitlements?check=[checkName]` and returns the `allowed` boolean. Used to disable "Create workspace" and "Invite member" buttons before the user attempts the action.

**File:** `app/api/entitlements/route.ts`

```ts
// GET /api/entitlements?check=createWorkspace
// Returns: { allowed: boolean, reason?: string }
```

---

## Entitlements Endpoint

`GET /api/entitlements?check=createWorkspace|connectAccount|inviteMember`

Runs the appropriate check function server-side and returns `{ allowed: boolean }`. The workspace context is resolved from the `x-workspace-id` header (injected by middleware). The user context is resolved from `getSession()`.

---

## Wiring Points

| Location | Check | Behavior when not allowed |
|---|---|---|
| Create workspace modal submit | `canCreateWorkspace` | Show inline error (upgrade prompt — link to billing) |
| Workspace switcher "Create workspace" button | `useCanCreateWorkspace` | Disable button + tooltip |
| Publishing settings "Connect account" | `canConnectAccount` | Disable button + tooltip |
| Team settings "Send invite" | `canInviteMember` | Disable button + tooltip |

Since limits are permissive (`99`) in Phase 4, none of these gates will actually block — but the infrastructure is in place and the UI shows the correct state.

---

## Activation Path (Future)

When Stripe billing is wired:
1. Change `PLAN_LIMITS.free.workspaces` from `99` to `1`
2. Change `PLAN_LIMITS.free.accounts` from `99` to `3`
3. etc.

No other code changes needed. The check functions, API routes, and UI hooks are already live.

---

## Files Changed / Created

| File | Action |
|---|---|
| `lib/billing/entitlements.ts` | New — plan limits + check functions |
| `hooks/use-entitlements.ts` | New — UI hooks |
| `app/api/entitlements/route.ts` | New — GET entitlements check endpoint |
