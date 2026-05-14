// app/api/channels/linkedin/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  fetchLinkedInOrganizations,
} from '@/lib/linkedin'
import { verifyOAuthState } from '@/lib/oauth-state'
import { signCookiePayload } from '@/lib/signed-cookie'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=linkedin_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/linkedin/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let tokens: { access_token: string; refresh_token?: string; expires_in: number }
  try {
    tokens = await exchangeLinkedInCode(code, redirectUri)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('LinkedIn token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed${detail(msg)}`)
  }

  let profile: { sub: string; name: string; email?: string }
  try {
    profile = await fetchLinkedInProfile(tokens.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('LinkedIn profile fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=profile_fetch_failed${detail(msg)}`)
  }

  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

  // Fetch org pages the user admins — 403 = scope not approved, returns []
  let orgs: Awaited<ReturnType<typeof fetchLinkedInOrganizations>> = []
  try {
    orgs = await fetchLinkedInOrganizations(tokens.access_token)
  } catch (err) {
    console.warn('LinkedIn org fetch failed (falling back to personal only):', err)
  }

  if (orgs.length > 0) {
    // Show picker: personal profile + all org pages
    const profiles = [
      { id: profile.sub,  name: profile.name, email: profile.email, type: 'personal' as const },
      ...orgs.map(org => ({ id: org.id, name: org.name, type: 'page' as const })),
    ]

    const cookieValue = signCookiePayload({
      workspaceId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      profiles,
    })

    const res = NextResponse.redirect(`${APP_URL()}/settings/publishing?select=linkedin`)
    res.cookies.set('li_pending_profiles', cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   600,
      path:     '/',
    })
    return res
  }

  // No org pages — connect directly as personal profile
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
      expiresAt,
      accountId:    profile.sub,
      accountName:  profile.name,
      accountEmail: profile.email ?? null,
    })

    if (!credResult.ok) {
      console.error('LinkedIn credential upsert error:', credResult.error)
      return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=credential_db_failed${detail(credResult.error)}`)
    }

    return NextResponse.redirect(`${APP_URL()}/settings/publishing?connected=linkedin`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('LinkedIn OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=connect_failed${detail(msg)}`)
  }
}
