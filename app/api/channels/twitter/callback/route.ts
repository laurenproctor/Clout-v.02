import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeTwitterCode, fetchTwitterUser } from '@/lib/twitter'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'

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
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'twitter')
      .single()

    let channelId: string

    if (existing) {
      channelId = existing.id
      await supabase
        .from('channels')
        .update({ is_active: true, label: `@${user.username}` })
        .eq('id', channelId)
    } else {
      const { data: newCh, error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          platform:     'twitter',
          label:        `@${user.username}`,
          config:       { char_limit: 280 },
          is_active:    true,
        })
        .select('id')
        .single()

      if (error || !newCh) {
        console.error('Twitter channel insert error:', error?.message)
        return NextResponse.redirect(`${APP_URL()}/channels?error=channel_db_failed`)
      }
      channelId = newCh.id
    }

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
      if (!existing) {
        await supabase.from('channels').delete().eq('id', channelId)
      }
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
