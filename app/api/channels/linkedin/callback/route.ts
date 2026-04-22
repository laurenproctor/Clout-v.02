// app/api/channels/linkedin/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeLinkedInCode, fetchLinkedInProfile } from '@/lib/linkedin'
import { verifyOAuthState } from '@/lib/oauth-state'
import { upsertChannelCredential } from '@/lib/domain/credentials'

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

  try {
    const tokens  = await exchangeLinkedInCode(code, redirectUri)
    const profile = await fetchLinkedInProfile(tokens.access_token)

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'linkedin')
      .single()

    let channelId: string

    if (existing) {
      channelId = existing.id
      await supabase
        .from('channels')
        .update({ is_active: true, label: profile.name })
        .eq('id', channelId)
    } else {
      const { data: newCh, error } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          platform:     'linkedin',
          label:        profile.name,
          config:       { char_limit: 3000, hashtag_count: 5 },
          is_active:    true,
        })
        .select('id')
        .single()

      if (error || !newCh) {
        console.error('LinkedIn channel insert error:', error)
        return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed`)
      }
      channelId = newCh.id
    }

    // Store credentials — service role, never exposed to client
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
      // Clean up newly-created channel to avoid orphan
      if (!existing) {
        await supabase.from('channels').delete().eq('id', channelId)
      }
      return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed`)
    }

    return NextResponse.redirect(`${APP_URL()}/channels?connected=linkedin`)
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err)
    return NextResponse.redirect(`${APP_URL()}/channels?error=connect_failed`)
  }
}
