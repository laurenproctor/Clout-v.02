import { getAnalyticsConnection, upsertAnalyticsConnection } from '@/lib/analytics/connections'

const BING_API = 'https://ssl.bing.com/webmaster/api.svc/json'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

async function getBingAccessToken(workspaceId: string): Promise<string> {
  const conn = await getAnalyticsConnection(workspaceId, 'bing_wmt')
  if (!conn) throw new Error('No Bing Webmaster Tools connection found')

  const now = Math.floor(Date.now() / 1000)
  if (conn.expires_at && conn.expires_at > now + 60) {
    return conn.access_token
  }

  if (!conn.refresh_token) throw new Error('No Bing refresh token — reconnect required')

  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: conn.refresh_token,
      client_id:     process.env.BING_CLIENT_ID!,
      client_secret: process.env.BING_CLIENT_SECRET!,
      scope:         'https://webmaster.api.bing.com/.default offline_access',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Bing token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string }
  if (!data.access_token) throw new Error('Bing token refresh returned no access_token')

  const newExpiresAt = now + data.expires_in

  await upsertAnalyticsConnection({
    workspace_id:  workspaceId,
    provider:      'bing_wmt',
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? conn.refresh_token,
    expires_at:    newExpiresAt,
    connected_by:  conn.connected_by,
  })

  return data.access_token
}

export async function bingGet<T>(workspaceId: string, method: string, params?: Record<string, string>): Promise<T> {
  const token = await getBingAccessToken(workspaceId)
  const url = new URL(`${BING_API}/${method}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bing API error ${res.status} (${method}): ${text}`)
  }

  const json = await res.json() as { d: T }
  return json.d
}
