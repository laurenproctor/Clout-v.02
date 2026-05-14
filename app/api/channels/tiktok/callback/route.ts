import { NextRequest, NextResponse } from 'next/server'
import { exchangeTikTokCode, fetchTikTokUser } from '@/lib/tiktok'
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
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=tiktok_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  const codeVerifier = req.cookies.get('tt_pkce')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=tiktok_pkce_missing`)
  }

  const redirectUri = `${APP_URL()}/api/channels/tiktok/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let tokens: { access_token: string; refresh_token: string; expires_in: number; open_id: string }
  try {
    tokens = await exchangeTikTokCode(code, redirectUri, codeVerifier)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TikTok token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed${detail(msg)}`)
  }

  let user: { open_id: string; display_name: string; avatar_url: string }
  try {
    user = await fetchTikTokUser(tokens.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TikTok user fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=profile_fetch_failed${detail(msg)}`)
  }

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'tiktok',
      accountId:   tokens.open_id,
      accountType: 'personal',
      label:       user.display_name,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
      accountId:    tokens.open_id,
      accountName:  user.display_name,
      accountEmail: null,
    })

    if (!credResult.ok) {
      console.error('TikTok credential upsert error:', credResult.error)
      return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=credential_db_failed${detail(credResult.error)}`)
    }

    const res = NextResponse.redirect(`${APP_URL()}/settings/publishing?connected=tiktok`)
    res.cookies.delete('tt_pkce')
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TikTok OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=connect_failed${detail(msg)}`)
  }
}
