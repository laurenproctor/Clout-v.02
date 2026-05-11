import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildFacebookAuthUrl } from '@/lib/facebook'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/facebook/callback`
  const state = signOAuthState(session.workspaceId)

  return NextResponse.redirect(buildFacebookAuthUrl(redirectUri, state))
}
