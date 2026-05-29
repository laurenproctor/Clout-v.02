import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const authUser = await getAuthenticatedUserId()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const token = body.token?.trim()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const supabase = createServiceClient()

  // Fetch invite
  const { data: invite } = await supabase
    .from('workspace_invites')
    .select('id, email, role, workspace_id, invited_by, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })

  // Strict email match: user's email must match invite email
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', authUser.userId)
    .single()

  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
  }

  // Already a member?
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', authUser.userId)
    .maybeSingle()

  if (existing) {
    // Already a member — just mark invite accepted and return slug
    await supabase
      .from('workspace_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    const { data: ws } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('id', invite.workspace_id)
      .single()

    return NextResponse.json({ workspaceSlug: ws?.slug ?? '' })
  }

  // Add to workspace
  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: invite.workspace_id,
    user_id: authUser.userId,
    role: invite.role,
    invited_by: invite.invited_by,
  })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  // Mark accepted
  await supabase
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  const { data: ws } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', invite.workspace_id)
    .single()

  return NextResponse.json({ workspaceSlug: ws?.slug ?? '' })
}
