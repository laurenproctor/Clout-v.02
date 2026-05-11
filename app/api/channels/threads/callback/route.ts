import { NextRequest, NextResponse } from 'next/server'
import { exchangeThreadsCode, exchangeForLongLivedToken, fetchThreadsProfile } from '@/lib/threads'
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
    return NextResponse.redirect(`${APP_URL()}/channels?error=threads_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/threads/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  // Exchange code for short-lived token, then immediately get long-lived (60-day) token
  let longToken: string
  let expiresIn: number
  let userId: string
  try {
    const shortLived = await exchangeThreadsCode(code, redirectUri)
    userId = shortLived.user_id
    const longLived = await exchangeForLongLivedToken(shortLived.access_token)
    longToken = longLived.access_token
    expiresIn = longLived.expires_in
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Threads token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  let profile: { id: string; username: string; name: string }
  try {
    profile = await fetchThreadsProfile(longToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Threads profile fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'threads',
      accountId:   profile.id,
      accountType: 'personal',
      label:       `@${profile.username}`,
    })

    // Threads uses same-token refresh — no separate refresh_token field
    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  longToken,
      refreshToken: null,
      expiresAt:    Math.floor(Date.now() / 1000) + expiresIn,
      accountId:    profile.id,
      accountName:  profile.username,
      accountEmail: null,
    })

    if (!credResult.ok) {
      console.error('Threads credential upsert error:', credResult.error)
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
    }

    return NextResponse.redirect(`${APP_URL()}/channels?connected=threads`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Threads OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
  }
}
