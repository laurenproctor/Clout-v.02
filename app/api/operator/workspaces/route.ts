import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Check operator role
  const { data: user } = await supabase
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()

  if (!user?.operator_role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // super_admin sees all workspaces; agency_operator sees only assigned ones
  let query = supabase
    .from('workspaces')
    .select(`
      id, name, slug, plan, created_at,
      assigned_operator_id,
      workspace_members(count)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (user.operator_role === 'agency_operator') {
    query = query.eq('assigned_operator_id', session.userId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
