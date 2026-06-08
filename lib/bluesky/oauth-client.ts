import { NodeOAuthClient } from '@atproto/oauth-client-node'
import type { NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node'
import { createServiceClient } from '@/lib/supabase/service'

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL is not set')
  return url
}

function buildClient(): NodeOAuthClient {
  const appUrl = getAppUrl()

  return new NodeOAuthClient({
    clientMetadata: {
      client_id:                    `${appUrl}/api/channels/bluesky/client-metadata`,
      client_name:                  'Clout',
      client_uri:                   appUrl,
      redirect_uris:                [`${appUrl}/api/channels/bluesky/callback`],
      scope:                        'atproto transition:generic',
      grant_types:                  ['authorization_code', 'refresh_token'],
      response_types:               ['code'],
      token_endpoint_auth_method:   'none',
      application_type:             'web',
      dpop_bound_access_tokens:     true,
    },

    stateStore: {
      async get(key: string): Promise<NodeSavedState | undefined> {
        const supabase = createServiceClient()
        const { data } = await supabase
          .from('bluesky_oauth_states')
          .select('state_data, expires_at')
          .eq('key', key)
          .single()
        if (!data) return undefined
        if (new Date(data.expires_at) < new Date()) {
          await supabase.from('bluesky_oauth_states').delete().eq('key', key)
          return undefined
        }
        return data.state_data as NodeSavedState
      },
      async set(key: string, value: NodeSavedState): Promise<void> {
        const supabase = createServiceClient()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        await supabase.from('bluesky_oauth_states').upsert(
          { key, state_data: value, expires_at: expiresAt },
          { onConflict: 'key' }
        )
      },
      async del(key: string): Promise<void> {
        const supabase = createServiceClient()
        await supabase.from('bluesky_oauth_states').delete().eq('key', key)
      },
    },

    sessionStore: {
      async get(sub: string): Promise<NodeSavedSession | undefined> {
        const supabase = createServiceClient()
        const { data } = await supabase
          .from('bluesky_oauth_sessions')
          .select('session_data')
          .eq('sub', sub)
          .single()
        if (!data) return undefined
        return data.session_data as NodeSavedSession
      },
      async set(sub: string, value: NodeSavedSession): Promise<void> {
        const supabase = createServiceClient()
        await supabase.from('bluesky_oauth_sessions').upsert(
          { sub, session_data: value, updated_at: new Date().toISOString() },
          { onConflict: 'sub' }
        )
      },
      async del(sub: string): Promise<void> {
        const supabase = createServiceClient()
        await supabase.from('bluesky_oauth_sessions').delete().eq('sub', sub)
      },
    },
  })
}

// Module-level singleton — safe for serverless since stores are DB-backed
let _client: NodeOAuthClient | null = null

export function getOAuthClient(): NodeOAuthClient {
  if (!_client) _client = buildClient()
  return _client
}
