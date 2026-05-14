import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
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
