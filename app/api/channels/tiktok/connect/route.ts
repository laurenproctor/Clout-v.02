import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildTikTokAuthUrl, generateCodeVerifier, deriveCodeChallenge } from '@/lib/tiktok'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redirectUri   = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/tiktok/callback`
  const state         = signOAuthState(session.workspaceId)
  const codeVerifier  = generateCodeVerifier()
  const codeChallenge = await deriveCodeChallenge(codeVerifier)

  const authUrl = buildTikTokAuthUrl(redirectUri, state, codeChallenge)

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('tt_pkce', codeVerifier, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })
  return res
}
