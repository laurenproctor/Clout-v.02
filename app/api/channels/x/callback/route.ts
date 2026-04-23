// app/api/channels/x/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeXCode, fetchXProfile } from '@/lib/providers/x/client'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { logProviderEvent } from '@/lib/domain/provider-health'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=x_denied`)
  }

  let workspaceId: string
  let codeVerifier: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId  = payload.workspaceId
    if (!payload.codeVerifier) throw new Error('Missing PKCE code_verifier in state')
    codeVerifier = payload.codeVerifier
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/x/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let tokens: { access_token: string; refresh_token?: string; expires_in: number }
  try {
    tokens = await exchangeXCode(code, redirectUri, codeVerifier)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('X token exchange failed:', msg)
    await logProviderEvent({
      workspaceId,
      platform:     'x',
      eventType:    'connect_failed',
      errorCode:    'token_exchange_failed',
      errorMessage: msg,
    })
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  let profile: { id: string; name: string; username: string }
  try {
    profile = await fetchXProfile(tokens.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('X profile fetch failed:', msg)
    await logProviderEvent({
      workspaceId,
      platform:     'x',
      eventType:    'connect_failed',
      errorCode:    'profile_fetch_failed',
      errorMessage: msg,
    })
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'x')
      .single()

    let channelId: string

    if (existing) {
      channelId = existing.id
      await supabase
        .from('channels')
        .update({ is_active: true, label: `@${profile.username}` })
        .eq('id', channelId)
    } else {
      const { data: newCh, error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          platform:     'x',
          label:        `@${profile.username}`,
          config:       { char_limit: 280 },
          is_active:    true,
        })
        .select('id')
        .single()

      if (error || !newCh) {
        const msg = error?.message ?? 'no data returned'
        console.error('X channel insert error:', msg)
        await logProviderEvent({
          workspaceId,
          platform:     'x',
          eventType:    'connect_failed',
          errorCode:    'channel_db_failed',
          errorMessage: msg,
        })
        return NextResponse.redirect(`${APP_URL()}/channels?error=channel_db_failed${detail(msg)}`)
      }
      channelId = newCh.id
    }

    // X tokens may not always include expires_in — default 2h if absent
    const expiresAt = tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : Math.floor(Date.now() / 1000) + 7200

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      accountId:    profile.id,
      accountName:  profile.name,
      accountEmail: null,  // X basic scopes don't expose email
    })

    if (!credResult.ok) {
      console.error('X credential upsert error:', credResult.error)
      if (!existing) {
        await supabase.from('channels').delete().eq('id', channelId)
      }
      await logProviderEvent({
        workspaceId,
        channelId,
        platform:     'x',
        eventType:    'connect_failed',
        errorCode:    'credential_db_failed',
        errorMessage: credResult.error,
      })
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
    }

    await logProviderEvent({
      workspaceId,
      channelId,
      platform:  'x',
      eventType: 'connect_success',
      metadata:  { username: profile.username },
    })

    return NextResponse.redirect(`${APP_URL()}/channels?connected=x`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('X OAuth callback error:', msg)
    await logProviderEvent({
      workspaceId,
      platform:     'x',
      eventType:    'connect_failed',
      errorCode:    'connect_failed',
      errorMessage: msg,
    })
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
  }
}
