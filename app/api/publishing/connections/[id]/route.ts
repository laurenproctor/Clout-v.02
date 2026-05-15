import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deleteConnection } from '@/lib/publishing/domain'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspaceId).eq('user_id', session.userId).single()

  if (!member || !['owner', 'admin'].includes(member.role as string)) {
    return NextResponse.json({ error: 'Only owners and admins can remove connections.' }, { status: 403 })
  }

  const { id } = await params
  const result = await deleteConnection(id, session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Only workspace owners and admins can update connections
  const supabaseAuth = await createClient()
  const { data: member } = await supabaseAuth
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!member || !(['owner', 'admin'] as string[]).includes(member.role as string)) {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  const body = await req.json() as { default_blog_id?: string; selected_publication_id?: string; label?: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.label) updates.label = body.label

  // Merge metadata updates — fetch current metadata first
  if (body.default_blog_id || body.selected_publication_id !== undefined) {
    const { data: conn } = await supabase
      .from('publishing_connections')
      .select('metadata')
      .eq('id', id)
      .eq('workspace_id', session.workspaceId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 })
    }
    const existing = conn.metadata as Record<string, unknown>
    updates.metadata = {
      ...existing,
      ...(body.default_blog_id           ? { default_blog_id: body.default_blog_id } : {}),
      ...(body.selected_publication_id !== undefined ? { selected_publication_id: body.selected_publication_id } : {}),
    }
  }

  const { error } = await supabase
    .from('publishing_connections')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', session.workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
