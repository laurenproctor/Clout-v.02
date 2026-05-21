import { getAccessToken } from '@/lib/analytics/connections'

const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3'

export async function gscPost(
  workspaceId: string,
  siteUrl: string,
  body: unknown,
): Promise<unknown> {
  const token = await getAccessToken(workspaceId, 'gsc')
  const encoded = encodeURIComponent(siteUrl)
  const res = await fetch(`${GSC_API}/sites/${encoded}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function listGSCSites(workspaceId: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const token = await getAccessToken(workspaceId, 'gsc')
  const res = await fetch(`${GSC_API}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC sites list error ${res.status}: ${text}`)
  }
  const data = await res.json() as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }
  return data.siteEntry ?? []
}
