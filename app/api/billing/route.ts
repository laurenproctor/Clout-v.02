import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select()
    .eq('workspace_id', session.workspaceId)
    .single()

  if (!data) {
    return NextResponse.json({
      plan: 'free',
      status: 'trialing',
      entitlements: {
        captures_per_month: 10,
        generations_per_month: 20,
        lenses_max: 3,
        members_max: 1,
        voice_minutes_per_month: 30,
        operator_access: false,
      },
      current_period_end: null,
      stripe_customer_id: null,
    })
  }

  return NextResponse.json(data)
}
