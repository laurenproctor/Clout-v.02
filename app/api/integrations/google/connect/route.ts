import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { signOAuthState } from '@/lib/oauth-state'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ')

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // signOAuthState is synchronous — no await
  const state = signOAuthState(session.workspaceId)
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
}
