import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const body = await req.json()
  const email = body.email?.trim().toLowerCase()
  const role = body.role ?? 'editor'

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error } = await supabase.from('workspace_invites').insert({
    workspace_id: session.workspaceId,
    email,
    role,
    invited_by: session.userId,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email already has a pending invite' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const inviteId = url.searchParams.get('id')
  if (!inviteId) return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })

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

  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId)
    .eq('workspace_id', session.workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
