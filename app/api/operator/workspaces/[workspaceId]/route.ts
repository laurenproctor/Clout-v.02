import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceId } = await params
  const supabase = await createClient()

  // Verify operator access
  const { data: user } = await supabase
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()

  if (!user?.operator_role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, plan, created_at, assigned_operator_id')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // agency_operator can only access assigned workspaces
  if (
    user.operator_role === 'agency_operator' &&
    workspace.assigned_operator_id !== session.userId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [membersRes, capturesRes, outputsRes, draftsRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, role, joined_at')
      .eq('workspace_id', workspaceId),
    supabase
      .from('captures')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_private', false)
      .is('deleted_at', null)
      .gte('created_at', monthStart),
    supabase
      .from('outputs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null),
    supabase
      .from('outputs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'draft')
      .is('deleted_at', null),
  ])

  // Recent outputs for preview
  const { data: recentOutputs } = await supabase
    .from('outputs')
    .select('id, title, status, created_at, content')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    workspace,
    members: membersRes.data ?? [],
    stats: {
      capturesThisMonth: capturesRes.count ?? 0,
      totalOutputs: outputsRes.count ?? 0,
      draftsPendingReview: draftsRes.count ?? 0,
    },
    recentOutputs: recentOutputs ?? [],
  })
}
