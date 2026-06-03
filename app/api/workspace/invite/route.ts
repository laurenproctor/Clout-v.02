import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { renderHtml, renderText } from '@/lib/email/templates/workspace-invite'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clout.app'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

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

  // Fetch token + context for email (fire-and-forget — don't block invite creation)
  void sendInviteEmail({ supabase, workspaceId: session.workspaceId, inviterId: session.userId, email, role })

  return NextResponse.json({ ok: true }, { status: 201 })
}

async function sendInviteEmail({
  supabase,
  workspaceId,
  inviterId,
  email,
  role,
}: {
  supabase: ReturnType<typeof createServiceClient>
  workspaceId: string
  inviterId: string
  email: string
  role: string
}) {
  try {
    const [{ data: invite }, { data: workspace }, { data: inviter }] = await Promise.all([
      supabase
        .from('workspace_invites')
        .select('token')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase.from('workspaces').select('name').eq('id', workspaceId).single(),
      supabase.from('users').select('full_name, email').eq('id', inviterId).single(),
    ])

    if (!invite?.token || !workspace?.name) return

    const inviteUrl = `${APP_URL}/invite/${invite.token}`
    const workspaceName = workspace.name
    const invitedByName = inviter?.full_name ?? inviter?.email ?? 'Someone'

    const [html, text] = await Promise.all([
      renderHtml({ workspaceName, invitedByName, role, inviteUrl }),
      Promise.resolve(renderText({ workspaceName, invitedByName, role, inviteUrl })),
    ])

    const { data: sent, error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: `You've been invited to join ${workspaceName}`,
      html,
      text,
    })

    await supabase.from('email_events').insert({
      idempotency_key: `workspace_invite:${invite.token}`,
      type: 'workspace_invite',
      recipient_email: email,
      workspace_id: workspaceId,
      payload: { type: 'workspace_invite', token: invite.token, workspaceName, role } as unknown as never,
      status: sendError ? 'failed' : 'sent',
      resend_id: sent?.id ?? null,
      sent_at: sendError ? null : new Date().toISOString(),
      error: sendError ? sendError.message : null,
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
    })
  } catch {
    // Email failure is non-fatal — invite is already in the DB
  }
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
