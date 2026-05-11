import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeFacebookCode,
  getLongLivedFacebookToken,
  fetchFacebookPages,
} from '@/lib/facebook'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=facebook_denied`)
  }

  let workspaceId: string
  try {
    const payload = verifyOAuthState(state)
    workspaceId = payload.workspaceId
  } catch {
    return NextResponse.redirect(`${APP_URL()}/channels?error=session_expired`)
  }

  const redirectUri = `${APP_URL()}/api/channels/facebook/callback`
  const detail = (msg: string) => `&detail=${encodeURIComponent(msg)}`

  // Exchange code → short-lived user token → long-lived user token
  let longToken: string
  let expiresIn: number
  try {
    const short = await exchangeFacebookCode(code, redirectUri)
    const long  = await getLongLivedFacebookToken(short.access_token)
    longToken = long.access_token
    expiresIn = long.expires_in
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Facebook token exchange failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=token_exchange_failed${detail(msg)}`)
  }

  // Get the first page the user manages — we publish as the page, not the user
  let pages: Awaited<ReturnType<typeof fetchFacebookPages>>
  try {
    pages = await fetchFacebookPages(longToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Facebook pages fetch failed:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=profile_fetch_failed${detail(msg)}`)
  }

  if (pages.length === 0) {
    return NextResponse.redirect(`${APP_URL()}/channels?error=facebook_no_pages`)
  }

  // Use the first page. Page access tokens derived from a long-lived user token
  // do not expire on a regular schedule.
  const page = pages[0]

  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .single()

    let channelId: string

    if (existing) {
      channelId = existing.id
      await supabase
        .from('channels')
        .update({ is_active: true, label: page.name })
        .eq('id', channelId)
    } else {
      const { data: newCh, error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          platform:     'facebook',
          label:        page.name,
          config:       {},
          is_active:    true,
        })
        .select('id')
        .single()

      if (error || !newCh) {
        const msg = error?.message ?? 'no data returned'
        console.error('Facebook channel insert error:', msg)
        return NextResponse.redirect(`${APP_URL()}/channels?error=channel_db_failed${detail(msg)}`)
      }
      channelId = newCh.id
    }

    // Store the page access token — account_id is the page ID used for publishing
    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken:  page.access_token,
      refreshToken: longToken,            // keep long-lived user token for re-fetching page tokens
      expiresAt:    Math.floor(Date.now() / 1000) + expiresIn,
      accountId:    page.id,
      accountName:  page.name,
      accountEmail: null,
    })

    if (!credResult.ok) {
      console.error('Facebook credential upsert error:', credResult.error)
      if (!existing) {
        await supabase.from('channels').delete().eq('id', channelId)
      }
      return NextResponse.redirect(`${APP_URL()}/channels?error=credential_db_failed${detail(credResult.error)}`)
    }

    return NextResponse.redirect(`${APP_URL()}/channels?connected=facebook`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Facebook OAuth callback error:', msg)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed${detail(msg)}`)
  }
}
