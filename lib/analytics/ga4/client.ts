import { getAccessToken } from '@/lib/analytics/connections'

const DATA_API = 'https://analyticsdata.googleapis.com/v1beta'
const ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta'

export async function ga4DataPost(
  workspaceId: string,
  propertyId: string,
  endpoint: string,
  body: unknown,
): Promise<unknown> {
  const token = await getAccessToken(workspaceId, 'ga4')
  const res = await fetch(`${DATA_API}/properties/${propertyId}:${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GA4 API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function listGA4Properties(workspaceId: string): Promise<Array<{ propertyId: string; displayName: string; account: string }>> {
  const token = await getAccessToken(workspaceId, 'ga4')
  const res = await fetch(`${ADMIN_API}/accountSummaries`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GA4 Admin API error ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    accountSummaries?: Array<{
      account: string
      displayName: string
      propertySummaries?: Array<{ property: string; displayName: string }>
    }>
  }

  const results: Array<{ propertyId: string; displayName: string; account: string }> = []
  for (const account of data.accountSummaries ?? []) {
    for (const prop of account.propertySummaries ?? []) {
      results.push({
        propertyId: prop.property.replace('properties/', ''),
        displayName: prop.displayName,
        account: account.displayName,
      })
    }
  }
  return results
}
