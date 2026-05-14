import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeFacebookCode,
  getLongLivedFacebookToken,
  fetchFacebookPages,
} from '@/lib/facebook'
import { verifyOAuthState } from '@/lib/oauth-state'
import { signCookiePayload } from '@/lib/signed-cookie'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=facebook_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/facebook/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let longToken: string
  let expiresIn: number
  try {
    const short = await exchangeFacebookCode(code, redirectUri)
    const long  = await getLongLivedFacebookToken(short.access_token)
    longToken = long.access_token
    expiresIn = long.expires_in
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Facebook token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed${detail(msg)}`)
  }

  let pages: Awaited<ReturnType<typeof fetchFacebookPages>>
  try {
    pages = await fetchFacebookPages(longToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Facebook pages fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=profile_fetch_failed${detail(msg)}`)
  }

  if (pages.length === 0) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=facebook_no_pages`)
  }

  // Store all pages + user token in a signed HttpOnly cookie, then let the user pick
  const cookieValue = signCookiePayload({
    workspaceId,
    pages,
    userLongLivedToken: longToken,
    userTokenExpiresIn: expiresIn,
  })

  const res = NextResponse.redirect(`${APP_URL()}/settings/publishing?select=facebook`)
  res.cookies.set('fb_pending_pages', cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  })
  return res
}
