import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeInstagramCode,
  getLongLivedInstagramToken,
  fetchInstagramAccount,
} from '@/lib/instagram'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=instagram_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/instagram/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  let longToken: string
  let expiresIn: number
  try {
    const short = await exchangeInstagramCode(code, redirectUri)
    const long  = await getLongLivedInstagramToken(short.access_token)
    longToken = long.access_token
    expiresIn = long.expires_in
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Instagram token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  let account: Awaited<ReturnType<typeof fetchInstagramAccount>>
  try {
    account = await fetchInstagramAccount(longToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Instagram account fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  if (!account) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=instagram_no_business_account`)
  }

  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .single()

    let channelId: string

    if (existing) {
      channelId = existing.id
      await supabase
        .from('channels')
        .update({ is_active: true, label: account.username })
        .eq('id', channelId)
    } else {
      const { data: newCh, error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          platform:     'instagram',
          label:        account.username,
          config:       {},
          is_active:    true,
        })
        .select('id')
        .single()

      if (error || !newCh) {
        const msg = error?.message ?? 'no data returned'
        console.error('Instagram channel insert error:', msg)
        return NextResponse.redirect(`${APP_URL()}/channels?error=channel_db_failed${detail(msg)}`)
      }
      channelId = newCh.id
    }

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  longToken,
      refreshToken: null,
      expiresAt:    Math.floor(Date.now() / 1000) + expiresIn,
      accountId:    account.id,
      accountName:  account.username,
      accountEmail: null,
    })

    if (!credResult.ok) {
      console.error('Instagram credential upsert error:', credResult.error)
      if (!existing) {
        await supabase.from('channels').delete().eq('id', channelId)
      }
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
    }

    return NextResponse.redirect(`${APP_URL()}/channels?connected=instagram`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Instagram OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
  }
}
