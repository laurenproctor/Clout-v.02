import { NextRequest, NextResponse } from 'next/server'
import { exchangeTwitterCode, fetchTwitterUser } from '@/lib/twitter'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=twitter_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const codeVerifier = req.cookies.get('tw_pkce')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=twitter_pkce_missing`)
  }

  const redirectUri = `${APP_URL()}/api/channels/twitter/callback`

  let tokens: { access_token: string; refresh_token?: string; expires_in: number }
  try {
    tokens = await exchangeTwitterCode(code, redirectUri, codeVerifier)
  } catch (err) {
    console.error('Twitter token exchange failed:', err)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed`)
  }

  let user: { id: string; name: string; username: string }
  try {
    user = await fetchTwitterUser(tokens.access_token)
  } catch (err) {
    console.error('Twitter profile fetch failed:', err)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed`)
  }

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'x',
      accountId:   user.id,
      accountType: 'personal',
      label:       `@${user.username}`,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt:    Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 7200),
      accountId:    user.id,
      accountName:  user.name,
      accountEmail: null,
    })

    if (!credResult.ok) {
      console.error('Twitter credential upsert error:', credResult.error)
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed`)
    }

    const res = NextResponse.redirect(`${APP_URL()}/channels?connected=twitter`)
    res.cookies.delete('tw_pkce')
    return res
  } catch (err) {
    console.error('Twitter OAuth callback error:', err)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed`)
  }
}
