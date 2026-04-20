import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const [workspaceRes, membersRes] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug, plan')
      .eq('id', session.workspaceId)
      .single(),
    supabase
      .from('workspace_members')
      .select('user_id, role', { count: 'exact' })
      .eq('workspace_id', session.workspaceId),
  ])

  return NextResponse.json({
    workspace: workspaceRes.data,
    memberCount: membersRes.count ?? 0,
    userRole: membersRes.data?.find((m) => m.user_id === session.userId)?.role ?? 'viewer',
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('workspaces')
    .update({
      ...(body.name?.trim() && { name: body.name.trim() }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.workspaceId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
