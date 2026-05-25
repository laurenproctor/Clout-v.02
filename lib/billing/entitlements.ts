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

export async function canCreateWorkspace(userId: string): Promise<EntitlementResult> {
  const supabase = createServiceClient()

  const [{ count: ownedCount }, { data: subs }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'owner'),
    supabase
      .from('workspace_members')
      .select('workspaces(subscriptions(plan))')
      .eq('user_id', userId)
      .eq('role', 'owner'),
  ])

  const plans = (subs ?? []).flatMap((m) => {
    const ws = m.workspaces as unknown as { subscriptions: { plan: string } | null } | null
    const sub = ws?.subscriptions
    return sub ? [sub.plan] : []
  })

  const PLAN_ORDER: Plan[] = ['enterprise', 'business', 'pro', 'free']
  const highestPlan = PLAN_ORDER.find(p => plans.includes(p)) ?? 'free'
  const limit = PLAN_LIMITS[highestPlan].workspaces

  return check(ownedCount ?? 0, limit, 'workspace')
}

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
