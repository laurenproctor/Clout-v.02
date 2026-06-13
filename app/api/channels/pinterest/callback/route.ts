import { NextRequest, NextResponse } from 'next/server'
import { FEATURES } from '@/lib/features'
import { exchangePinterestCode, fetchPinterestProfile } from '@/lib/pinterest/oauth'
import { syncBoards } from '@/lib/pinterest/boards'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  if (!FEATURES.pinterestPublishing) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=pinterest_disabled`)
  }

  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=pinterest_denied`)
  }

  let workspaceId: string
  try {
    workspaceId = verifyOAuthState(state).workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/pinterest/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let tokens: Awaited<ReturnType<typeof exchangePinterestCode>>
  let profile: Awaited<ReturnType<typeof fetchPinterestProfile>>
  try {
    tokens = await exchangePinterestCode(code, redirectUri)
    profile = await fetchPinterestProfile(tokens.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Pinterest token/profile exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed${detail(msg)}`)
  }

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'pinterest',
      accountId:   profile.username,
      accountType: 'business',
      label:       `@${profile.username}`,
      profileImageUrl: profile.profileImageUrl ?? null,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
      accountId:    profile.username,
      accountName:  profile.username,
      accountEmail: null,
    })
    if (!credResult.ok) {
      console.error('Pinterest credential upsert error:', credResult.error)
      return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=credential_db_failed${detail(credResult.error)}`)
    }

    // Sync boards immediately so the user can pick a default. Non-fatal if it fails —
    // the user can re-sync from the settings card.
    try {
      await syncBoards(channelId)
    } catch (err) {
      console.error('Pinterest board sync failed on connect:', err instanceof Error ? err.message : String(err))
    }

    return NextResponse.redirect(`${APP_URL()}/settings/publishing?connected=pinterest`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Pinterest OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=connect_failed${detail(msg)}`)
  }
}
