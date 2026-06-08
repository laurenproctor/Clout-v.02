import { NextRequest, NextResponse } from 'next/server'
import { Agent } from '@atproto/api'
import { getOAuthClient } from '@/lib/bluesky/oauth-client'
import { verifyOAuthState } from '@/lib/oauth-state'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createServiceClient } from '@/lib/supabase/service'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const params      = req.nextUrl.searchParams
  const stateParam  = params.get('state')
  const oauthError  = params.get('error')

  if (oauthError || !stateParam) {
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=bluesky_denied`)
  }

  let workspaceId: string
  try {
    workspaceId = verifyOAuthState(stateParam).workspaceId
  } catch {
    const cookieWsId = req.cookies.get('bs_workspace')?.value
    if (!cookieWsId) {
      return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=session_expired`)
    }
    workspaceId = cookieWsId
  }

  const client = getOAuthClient()

  let did: string
  let session: Awaited<ReturnType<typeof client.callback>>['session']
  try {
    const result = await client.callback(params)
    session      = result.session
    did          = session.did
  } catch (err) {
    console.error('[bluesky] callback failed', err)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=token_exchange_failed`)
  }

  const agent      = new Agent(session)
  const profileRes = await agent.getProfile({ actor: did }).catch(() => null)

  const handle      = profileRes?.data.handle      ?? did
  const displayName = profileRes?.data.displayName ?? null
  const description = profileRes?.data.description ?? null
  const avatar      = profileRes?.data.avatar      ?? null

  const { channelId } = await createOrUpdateChannelByAccountId({
    workspaceId,
    platform:        'bluesky',
    accountId:       did,
    accountType:     'personal',
    label:           `@${handle}`,
    profileImageUrl: avatar,
  })

  // Merge metadata into channels.config — read first to preserve existing keys
  const supabase = createServiceClient()
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
      handle,
      displayName,
      description,
      char_limit:     300,
      connect_handle: handle,
    },
  }).eq('id', channelId)

  // IMPORTANT: BlueSky does NOT use access_token for auth.
  // Authentication is session-based via @atproto/oauth-client-node (DPoP-bound).
  // The actual session is stored in bluesky_oauth_sessions keyed by DID.
  // access_token is NOT NULL in channel_credentials so we store the DID here as
  // a sentinel to satisfy the constraint — it is NOT an OAuth token.
  // At publish time, publishBlueSkyOutput reads accountId (the DID) to call
  // oauthClient.restore(did), NOT to make authenticated HTTP calls with access_token.
  const credResult = await upsertChannelCredential({
    channelId,
    workspaceId,
    accessToken:  did,   // DID sentinel — NOT an OAuth token; see comment above
    refreshToken: null,
    expiresAt:    null,
    accountId:    did,   // canonical lookup key used by publishBlueSkyOutput
    accountName:  displayName ?? handle,
    accountEmail: null,
  })

  if (!credResult.ok) {
    console.error('[bluesky] credential upsert error:', credResult.error)
    return NextResponse.redirect(`${APP_URL()}/settings/publishing?error=credential_db_failed`)
  }

  // Attach channel_id + workspace_id to the session row written by client.callback()
  await supabase.from('bluesky_oauth_sessions').update({
    channel_id:   channelId,
    workspace_id: workspaceId,
    updated_at:   new Date().toISOString(),
  }).eq('sub', did)

  const res = NextResponse.redirect(`${APP_URL()}/settings/publishing?connected=bluesky`)
  res.cookies.delete('bs_workspace')
  return res
}
