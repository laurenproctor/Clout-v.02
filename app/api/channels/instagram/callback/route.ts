import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeInstagramCode,
  getLongLivedInstagramToken,
  fetchInstagramAccounts,
} from '@/lib/instagram'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { signCookiePayload } from '@/lib/signed-cookie'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=instagram_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/instagram/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let longToken: string
  let expiresIn: number
  try {
    const short = await exchangeInstagramCode(code, redirectUri)
    const long  = await getLongLivedInstagramToken(short.access_token)
    longToken = long.access_token
    expiresIn = long.expires_in
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Instagram token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  let accounts: Awaited<ReturnType<typeof fetchInstagramAccounts>>
  try {
    accounts = await fetchInstagramAccounts(longToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Instagram account fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  if (accounts.length === 0) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=instagram_no_business_account`)
  }

  // Single account: connect directly without a picker
  if (accounts.length === 1) {
    const account = accounts[0]
    try {
      const { channelId } = await createOrUpdateChannelByAccountId({
        workspaceId,
        platform:    'instagram',
        accountId:   account.id,
        accountType: 'business',
        label:       `@${account.username}`,
      })

      const credResult = await upsertChannelCredential({
        channelId,
        workspaceId,
        accessToken:  longToken,
        refreshToken: null,
        expiresAt:    Math.floor(Date.now() / 1000) + expiresIn,
        accountId:    account.id,
        accountName:  account.username,
        accountEmail: null,
      })

      if (!credResult.ok) {
        console.error('Instagram credential upsert error:', credResult.error)
        return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
      }

      return NextResponse.redirect(`${APP_URL()}/channels?connected=instagram`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
    }
  }

  // Multiple accounts: store in signed cookie and show picker
  const cookieValue = signCookiePayload({
    workspaceId,
    accounts,
    userLongLivedToken: longToken,
    userTokenExpiresIn: expiresIn,
  })

  const res = NextResponse.redirect(`${APP_URL()}/channels?select=instagram`)
  res.cookies.set('ig_pending_accounts', cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   600,
  })
  return res
}
