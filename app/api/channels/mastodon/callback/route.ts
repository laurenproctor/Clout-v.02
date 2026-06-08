import { NextRequest, NextResponse } from 'next/server'
import { verifyOAuthState } from '@/lib/oauth-state'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createServiceClient } from '@/lib/supabase/service'
import {
  exchangeMastodonCode,
  fetchMastodonAccount,
  getRedirectUri,
} from '@/lib/mastodon'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const params      = req.nextUrl.searchParams
  const code        = params.get('code')
  const stateParam  = params.get('state')
  const oauthError  = params.get('error')

  if (oauthError || !stateParam) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=mastodon_denied`)
  }

  let workspaceId: string
  let instanceUrl: string | undefined
  try {
    const payload = verifyOAuthState(stateParam)
    workspaceId  = payload.workspaceId
    instanceUrl  = payload.instanceUrl
  } catch {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  if (!instanceUrl) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=mastodon_denied`)
  }

  const supabase    = createServiceClient()
  const redirectUri = getRedirectUri()
  const detail      = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  // Fetch app registration for this instance
  const { data: appReg, error: appRegError } = await supabase
    .from('mastodon_app_registrations')
    .select('client_id, client_secret, max_characters')
    .eq('instance_url', instanceUrl)
    .single()

  if (appRegError || !appReg) {
    console.error('[mastodon] app registration not found', { instanceUrl })
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=mastodon_app_not_found`)
  }

  // Exchange code for access token
  let accessToken: string
  try {
    const result = await exchangeMastodonCode(
      instanceUrl,
      appReg.client_id,
      appReg.client_secret,
      code,
      redirectUri,
    )
    accessToken = result.accessToken
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mastodon] token exchange failed', { instanceUrl, err })
    return NextResponse.redirect(
      `${APP_URL()}/settings/publishing?error=token_exchange_failed${detail(msg)}`
    )
  }

  // Fetch user profile
  let profile: Awaited<ReturnType<typeof fetchMastodonAccount>>
  try {
    profile = await fetchMastodonAccount(instanceUrl, accessToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mastodon] profile fetch failed', { instanceUrl, err })
    return NextResponse.redirect(
      `${APP_URL()}/settings/publishing?error=profile_fetch_failed${detail(msg)}`
    )
  }

  const hostname = new URL(instanceUrl).hostname
  const label    = `@${profile.username}@${hostname}`

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:        'mastodon',
      accountId:       profile.id,
      accountType:     'personal',
      label,
      profileImageUrl: profile.avatar,
    })

    // Merge instance metadata into channel config (read first, preserve existing keys)
    const { data: existing } = await supabase
      .from('channels')
      .select('config')
      .eq('id', channelId)
      .single()

    const existingConfig =
      existing?.config && typeof existing.config === 'object' && !Array.isArray(existing.config)
        ? (existing.config as Record<string, unknown>)
        : {}

    await supabase.from('channels').update({
      config: {
        ...existingConfig,
        instance_url:      instanceUrl,
        instance_hostname: hostname,
        char_limit:        appReg.max_characters ?? 500,
        username:          profile.username,
        profile_url:       profile.profileUrl,
      },
    }).eq('id', channelId)

    // Store access token — Mastodon tokens don't expire, so expiresAt is null
    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken,
      refreshToken: null,
      expiresAt:    null,
      accountId:    profile.id,
      accountName:  profile.displayName,
      accountEmail: null,
    })

    if (!credResult.ok) {
      console.error('[mastodon] credential upsert error:', credResult.error)
      return NextResponse.redirect(
        `${APP_URL()}/settings/publishing?error=credential_db_failed${detail(credResult.error)}`
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mastodon] connect error:', msg)
    return NextResponse.redirect(
      `${APP_URL()}/settings/publishing?error=connect_failed${detail(msg)}`
    )
  }

  return NextResponse.redirect(`${APP_URL()}/settings/publishing?connected=mastodon`)
}
