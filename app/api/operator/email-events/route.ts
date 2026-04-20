import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUser = await createClient()
  const { data: caller } = await supabaseUser
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()

  if (caller?.operator_role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()
  let query = supabase
    .from('email_events')
    .select('id, type, recipient_email, error, attempt_count, created_at, status')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.eq('status', status as any)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
