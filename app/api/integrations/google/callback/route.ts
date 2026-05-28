import { NextRequest, NextResponse } from 'next/server'
import { verifyOAuthState } from '@/lib/oauth-state'
import { getSession } from '@/lib/auth/session'
import { upsertAnalyticsConnection } from '@/lib/analytics/connections'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings/analytics?error=google_denied`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings/analytics?error=missing_params`)
  }

  let workspaceId: string
  let returnTo: string
  try {
    const payload = verifyOAuthState(state)  // synchronous, returns StatePayload
    workspaceId = payload.workspaceId
    returnTo = payload.returnTo ?? '/settings/analytics'
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings/analytics?error=invalid_state`)
  }

  const session = await getSession()
  if (!session || session.workspaceId !== workspaceId) {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=workspace_mismatch`)
  }

  const redirectUri = `${APP_URL}/api/integrations/google/callback`

  let tokens: { access_token: string; refresh_token?: string; expires_in: number }
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${APP_URL}${returnTo}?error=token_exchange_failed`)
    }

    tokens = await tokenRes.json() as typeof tokens

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

    // Store same tokens for both ga4 and gsc (same Google account covers both scopes)
    await Promise.all([
      upsertAnalyticsConnection({
        workspace_id: workspaceId,
        provider: 'ga4',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        connected_by: session.userId,
      }),
      upsertAnalyticsConnection({
        workspace_id: workspaceId,
        provider: 'gsc',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        connected_by: session.userId,
      }),
    ])
  } catch {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=server_error`)
  }

  return NextResponse.redirect(`${APP_URL}${returnTo}?connected=google`)
}
