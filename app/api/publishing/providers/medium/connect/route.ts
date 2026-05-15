import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'
import { buildMediumAuthUrl } from '@/lib/publishing/providers/medium/oauth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/publishing/providers/medium/callback`
  const state       = signOAuthState(session.workspaceId)
  const authUrl     = buildMediumAuthUrl(redirectUri, state)

  return NextResponse.redirect(authUrl)
}
