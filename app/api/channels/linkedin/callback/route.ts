// app/api/channels/linkedin/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { exchangeLinkedInCode, fetchLinkedInProfile } from '@/lib/linkedin'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // User denied or LinkedIn returned error — redirect without writing anything
  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=linkedin_denied`)
  }

  // Verify signed state before any DB operation — fail closed on any error
  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    // Expired, tampered, or malformed — treat as auth failure
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/linkedin/callback`

  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let tokens: { access_token: string; refresh_token?: string; expires_in: number }
  try {
    tokens = await exchangeLinkedInCode(code, redirectUri)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('LinkedIn token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  let profile: { sub: string; name: string; email?: string }
  try {
    profile = await fetchLinkedInProfile(tokens.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('LinkedIn profile fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'linkedin',
      accountId:   profile.sub,
      accountType: 'personal',
      label:       profile.name,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
      accountId:    profile.sub,
      accountName:  profile.name,
      accountEmail: profile.email ?? null,
    })

    if (!credResult.ok) {
      console.error('LinkedIn credential upsert error:', credResult.error)
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
    }

    return NextResponse.redirect(`${APP_URL()}/channels?connected=linkedin`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('LinkedIn OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
  }
}
