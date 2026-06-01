import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertAnalyticsConnection } from '@/lib/analytics/connections'

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Try to recover returnTo from state even when Microsoft returns an error,
  // so the redirect lands on the correct workspace-scoped page.
  let returnTo = '/settings/publishing'
  let workspaceId: string | null = null
  if (state) {
    try {
      const payload = verifyOAuthState(state)
      workspaceId   = payload.workspaceId
      returnTo      = payload.returnTo ?? returnTo
    } catch {
      // state invalid; fall through to error redirect with default path
    }
  }

  if (error) {
    console.error('[bing/callback] Microsoft error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_denied`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_missing_params`)
  }
  if (!workspaceId) {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_invalid_state`)
  }

  const session = await getSession()
  if (!session || session.workspaceId !== workspaceId) {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_workspace_mismatch`)
  }

  const redirectUri = `${APP_URL}/api/integrations/bing/callback`

  try {
    const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.BING_CLIENT_ID!,
        client_secret: process.env.BING_CLIENT_SECRET!,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
        scope:         'https://webmaster.api.bing.com/.default offline_access',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_token_exchange_failed`)
    }

    const tokens = await tokenRes.json() as {
      access_token:  string
      refresh_token: string
      expires_in:    number
    }

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

    await upsertAnalyticsConnection({
      workspace_id:  workspaceId,
      provider:      'bing_wmt',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at:    expiresAt,
      connected_by:  session.userId,
    })
  } catch {
    return NextResponse.redirect(`${APP_URL}${returnTo}?error=bing_server_error`)
  }

  return NextResponse.redirect(`${APP_URL}${returnTo}?connected=bing`)
}
