import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Only super_admin can see all users
  const { data: caller } = await supabase
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()

  if (caller?.operator_role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, operator_role, created_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
