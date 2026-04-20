import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // Check caller is owner or admin
  const { data: caller } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!caller || !['owner', 'admin'].includes(caller.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, role = 'editor' } = body

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const validRoles = ['admin', 'editor', 'viewer']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Look up user by email
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .single()

  if (!user) {
    return NextResponse.json(
      { error: 'No Clout account found for that email. They need to sign up first.' },
      { status: 404 }
    )
  }

  // Check not already a member
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: session.workspaceId,
    user_id: user.id,
    role,
    invited_by: session.userId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
