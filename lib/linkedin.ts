// lib/linkedin.ts
// Server-side only. Never import from client components.

const OAUTH_BASE = 'https://www.linkedin.com/oauth/v2'
const API_BASE   = 'https://api.linkedin.com'
const LI_VERSION = '202401'

export function buildLinkedInAuthUrl(
  redirectUri: string,
  state: string,
  opts?: { forceLogin?: boolean },
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri:  redirectUri,
    state,
    // w_organization_social + r_organization_admin are needed for Company Page posting/listing
    // but require LinkedIn Marketing Developer Platform approval. If approved, add them here.
    // The org fetch in the callback handles 403 gracefully (returns []) if not yet approved.
    scope: 'openid profile email w_member_social',
  })
  // prompt=login forces LinkedIn to show the sign-in screen even if the user
  // is already logged in — necessary when connecting a second LinkedIn account.
  if (opts?.forceLogin) params.set('prompt', 'login')
  return `${OAUTH_BASE}/authorization?${params}`
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch(`${OAUTH_BASE}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch(`${OAUTH_BASE}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${text}`)
  }
  return res.json()
}

export interface LinkedInProfile {
  sub: string       // OpenID person identifier — used as urn:li:person:{sub}
  name: string
  email?: string
  picture?: string
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(`${API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch LinkedIn profile (${res.status})`)
  return res.json()
}

export interface LinkedInOrganization {
  id: string    // numeric organization id string
  name: string
  urn: string   // urn:li:organization:{id}
}

export async function fetchLinkedInOrganizations(
  accessToken: string
): Promise<LinkedInOrganization[]> {
  const aclRes = await fetch(
    `${API_BASE}/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
    {
      headers: {
        Authorization:               `Bearer ${accessToken}`,
        'LinkedIn-Version':          LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  )
  // 403 = scope not approved on this app — fall back to profile-only connect
  if (aclRes.status === 403) return []
  if (!aclRes.ok) throw new Error(`LinkedIn org ACL fetch failed (${aclRes.status})`)

  const aclData = await aclRes.json()
  const elements: Array<{ organization?: string }> = aclData.elements ?? []
  const orgUrns = elements
    .map(el => el.organization ?? '')
    .filter(urn => urn.startsWith('urn:li:organization:'))

  if (orgUrns.length === 0) return []

  const results: LinkedInOrganization[] = []
  for (const urn of orgUrns.slice(0, 10)) {
    const id = urn.replace('urn:li:organization:', '')
    const orgRes = await fetch(`${API_BASE}/rest/organizations/${id}`, {
      headers: {
        Authorization:               `Bearer ${accessToken}`,
        'LinkedIn-Version':          LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
    if (orgRes.ok) {
      const orgData = await orgRes.json()
      results.push({ id, urn, name: orgData.localizedName ?? `Organization ${id}` })
    }
  }
  return results
}

export async function postTextToLinkedIn(
  accessToken: string,
  authorUrn: string,  // urn:li:person:{sub} OR urn:li:organization:{id}
  text: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/rest/posts`, {
    method: 'POST',
    headers: {
      Authorization:              `Bearer ${accessToken}`,
      'Content-Type':             'application/json',
      'LinkedIn-Version':         LI_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author:               authorUrn,
      commentary:           text,
      visibility:           'PUBLIC',
      distribution: {
        feedDistribution:             'MAIN_FEED',
        targetEntities:               [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState:            'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LinkedIn post failed (${res.status}): ${body}`)
  }
  // LinkedIn returns the created post URN in the x-restli-id response header
  return res.headers.get('x-restli-id') ?? ''
}
