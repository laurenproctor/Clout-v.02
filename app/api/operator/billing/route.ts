import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()

  if (!user?.operator_role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Aggregate subscription data across all workspaces
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('plan, status, workspace_id, stripe_customer_id, current_period_end')
    .order('created_at', { ascending: false })

  if (!subscriptions) {
    return NextResponse.json({ subscriptions: [], summary: {} })
  }

  // Count by plan
  const byPlan: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  let withStripe = 0

  for (const sub of subscriptions) {
    byPlan[sub.plan] = (byPlan[sub.plan] ?? 0) + 1
    byStatus[sub.status] = (byStatus[sub.status] ?? 0) + 1
    if (sub.stripe_customer_id) withStripe++
  }

  return NextResponse.json({
    total: subscriptions.length,
    byPlan,
    byStatus,
    withStripe,
    recent: subscriptions.slice(0, 10),
  })
}
