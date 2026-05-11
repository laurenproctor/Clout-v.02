import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeTikTokCode, fetchTikTokUser } from '@/lib/tiktok'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=tiktok_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const codeVerifier = req.cookies.get('tt_pkce')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=tiktok_pkce_missing`)
  }

  const redirectUri = `${APP_URL()}/api/channels/tiktok/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let tokens: { access_token: string; refresh_token: string; expires_in: number; open_id: string }
  try {
    tokens = await exchangeTikTokCode(code, redirectUri, codeVerifier)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TikTok token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  let user: { open_id: string; display_name: string; avatar_url: string }
  try {
    user = await fetchTikTokUser(tokens.access_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TikTok user fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'tiktok')
      .single()

    let channelId: string

    if (existing) {
      channelId = existing.id
      await supabase
        .from('channels')
        .update({ is_active: true, label: user.display_name })
        .eq('id', channelId)
    } else {
      const { data: newCh, error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          platform:     'tiktok',
          label:        user.display_name,
          config:       {},
          is_active:    true,
        })
        .select('id')
        .single()

      if (error || !newCh) {
        const msg = error?.message ?? 'no data returned'
        console.error('TikTok channel insert error:', msg)
        return NextResponse.redirect(`${APP_URL()}/channels?error=channel_db_failed${detail(msg)}`)
      }
      channelId = newCh.id
    }

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
      if (!existing) {
        await supabase.from('channels').delete().eq('id', channelId)
      }
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
    }

    const res = NextResponse.redirect(`${APP_URL()}/channels?connected=tiktok`)
    res.cookies.delete('tt_pkce')
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TikTok OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
  }
}
