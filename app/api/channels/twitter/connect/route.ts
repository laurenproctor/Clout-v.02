import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildTwitterAuthUrl, generateCodeVerifier, deriveCodeChallenge } from '@/lib/twitter'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri   = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/twitter/callback`
  const state         = signOAuthState(session.workspaceId)
  const codeVerifier  = generateCodeVerifier()
  const codeChallenge = await deriveCodeChallenge(codeVerifier)

  const authUrl = buildTwitterAuthUrl(redirectUri, state, codeChallenge)

  const res = NextResponse.redirect(authUrl)
  // Store verifier in a short-lived HttpOnly cookie; callback reads and clears it
  res.cookies.set('tw_pkce', codeVerifier, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600, // 10 minutes — matches state TTL
    path:     '/',
  })
  return res
}
