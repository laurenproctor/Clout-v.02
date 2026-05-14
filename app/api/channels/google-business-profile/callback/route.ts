import { NextRequest, NextResponse } from 'next/server'
import { verifyOAuthState } from '@/lib/oauth-state'
import { signCookiePayload } from '@/lib/signed-cookie'
import { exchangeGBPCode } from '@/lib/channels/google-business-profile/auth'
import { listAllLocations } from '@/lib/channels/google-business-profile/locations'
import type { GBPAccount, GBPLocation } from '@/lib/channels/google-business-profile/types'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export interface GBPPendingPayload {
  workspaceId:  string
  locationPairs: { account: GBPAccount; locations: GBPLocation[] }[]
  accessToken:  string
  refreshToken: string | null
  expiresIn:    number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=gbp_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/google-business-profile/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let accessToken: string
  let refreshToken: string | null
  let expiresIn: number
  try {
    const tokens = await exchangeGBPCode(code, redirectUri)
    accessToken  = tokens.access_token
    refreshToken = tokens.refresh_token ?? null
    expiresIn    = tokens.expires_in
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('GBP token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed${detail(msg)}`)
  }

  let locationPairs: GBPPendingPayload['locationPairs']
  try {
    locationPairs = await listAllLocations(accessToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('GBP location fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=gbp_location_fetch_failed${detail(msg)}`)
  }

  if (locationPairs.length === 0) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=gbp_no_locations`)
  }

  const cookieValue = signCookiePayload<GBPPendingPayload>({
    workspaceId,
    locationPairs,
    accessToken,
    refreshToken,
    expiresIn,
  })

  const res = NextResponse.redirect(`${APP_URL()}/settings/publishing?select=google_business_profile`)
  res.cookies.set('gbp_pending_locations', cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  })
  return res
}
