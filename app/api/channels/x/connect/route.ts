// app/api/channels/x/connect/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { buildXAuthUrl, generateCodeVerifier, deriveCodeChallenge } from '@/lib/providers/x/client'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  if (process.env.ENABLE_X_CHANNEL !== 'true') {
    return NextResponse.json({ error: 'X channel not enabled' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const codeVerifier  = generateCodeVerifier()
  const codeChallenge = deriveCodeChallenge(codeVerifier)
  const redirectUri   = `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/x/callback`
  const state         = signOAuthState(session.workspaceId, codeVerifier)

  return NextResponse.redirect(buildXAuthUrl(redirectUri, state, codeChallenge))
}
