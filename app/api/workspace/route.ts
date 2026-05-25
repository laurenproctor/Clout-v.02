import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const [workspaceRes, membersRes, subRes] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug, plan, avatar_url, brand_color, slug_changed_at')
      .eq('id', session.workspaceId)
      .single(),
    supabase
      .from('workspace_members')
      .select('user_id, role', { count: 'exact' })
      .eq('workspace_id', session.workspaceId),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
  ])

  return NextResponse.json({
    workspace: workspaceRes.data,
    memberCount: membersRes.count ?? 0,
    userRole: membersRes.data?.find((m) => m.user_id === session.userId)?.role ?? 'viewer',
    subscription: subRes.data ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

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

  if (body.brand_color !== undefined && !/^#[0-9a-fA-F]{3,8}$/.test(body.brand_color)) {
    return NextResponse.json({ error: 'Invalid brand_color' }, { status: 400 })
  }

  const updates: { name?: string; brand_color?: string | null; updated_at?: string } = {}
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.brand_color !== undefined) updates.brand_color = body.brand_color
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', session.workspaceId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can delete this workspace' }, { status: 403 })
  }

  await supabase
    .from('workspaces')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', session.workspaceId)

  return NextResponse.json({ ok: true })
}
