import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import AcceptInviteForm from './accept-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: invite } = await supabase
    .from('workspace_invites')
    .select(`
      id,
      email,
      role,
      expires_at,
      accepted_at,
      workspaces!workspace_invites_workspace_id_fkey(id, name, slug),
      users!workspace_invites_invited_by_fkey(full_name, email)
    `)
    .eq('token', token)
    .maybeSingle()

  // Invalid / expired / already accepted
  const isExpired = invite && new Date(invite.expires_at) < new Date()
  const isAccepted = invite && invite.accepted_at !== null
  if (!invite || isExpired || isAccepted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-900 mb-2">
            {isAccepted ? 'Invite already used' : 'Invite not found or expired'}
          </p>
          <p className="text-sm text-zinc-500">
            {isAccepted
              ? 'This invitation has already been accepted.'
              : 'This invite link is no longer valid. Ask the workspace admin to send a new one.'}
          </p>
        </div>
      </div>
    )
  }

  const workspace = invite.workspaces as { id: string; name: string; slug: string } | null
  const inviter = invite.users as { full_name: string | null; email: string } | null
  const inviterName = inviter?.full_name ?? inviter?.email ?? 'Someone'
  const workspaceName = workspace?.name ?? 'a workspace'
  const workspaceSlug = workspace?.slug ?? ''

  const { userId: clerkId } = await auth()

  if (!clerkId) {
    const returnUrl = `/invite/${token}`
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-6">Invitation</p>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">
            Join {workspaceName}
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            {inviterName} has invited you to join <strong className="text-zinc-700">{workspaceName}</strong> as a{' '}
            <strong className="text-zinc-700">{invite.role}</strong>.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}
              className="block w-full rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Sign in to accept
            </a>
            <a
              href={`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`}
              className="block w-full rounded-md border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Create an account
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-6">Invitation</p>
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          Join {workspaceName}
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          {inviterName} has invited you to join <strong className="text-zinc-700">{workspaceName}</strong> as a{' '}
          <strong className="text-zinc-700">{invite.role}</strong>.
        </p>
        <AcceptInviteForm token={token} workspaceSlug={workspaceSlug} inviteEmail={invite.email} />
      </div>
    </div>
  )
}
