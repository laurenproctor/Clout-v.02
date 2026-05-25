import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const [{ data: memberships }, { data: invites }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, joined_at, users!workspace_members_user_id_fkey(id, full_name, email)')
      .eq('workspace_id', session.workspaceId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('workspace_invites')
      .select('id, email, role, created_at, expires_at')
      .eq('workspace_id', session.workspaceId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const members = (memberships ?? []).map((m) => {
    const u = m.users as { id: string; full_name: string | null; email: string } | null
    return {
      userId: u?.id ?? '',
      fullName: u?.full_name ?? null,
      email: u?.email ?? '',
      role: m.role,
      joinedAt: m.joined_at,
    }
  })

  return NextResponse.json({ members, invites: invites ?? [] })
}
