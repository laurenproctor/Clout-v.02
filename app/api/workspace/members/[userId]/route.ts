import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId: targetUserId } = await params

  const supabase = createServiceClient()
  const { data: actor } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!actor || actor.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
  }
  if (targetUserId === session.userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const body = await req.json()
  const newRole = body.role
  if (!['admin', 'editor', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', targetUserId)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId: targetUserId } = await params

  const supabase = createServiceClient()
  const { data: actor } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (targetUserId === session.userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', targetUserId)

  return NextResponse.json({ ok: true })
}
