// lib/facebook.ts
// Server-side only. Never import from client components.
// Meta Graph API v20.0: https://developers.facebook.com/docs/graph-api
// Required env vars: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET

const GRAPH_BASE = 'https://graph.facebook.com/v20.0'
const FB_SCOPES = 'pages_manage_posts,pages_read_engagement,pages_show_list'

export function buildFacebookAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID!,
    redirect_uri:  redirectUri,
    scope:         FB_SCOPES,
    state,
    response_type: 'code',
  })
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`
}

export async function exchangeFacebookCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri:  redirectUri,
    code,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Facebook code exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

// Short-lived user tokens (1h) should be exchanged for long-lived ones (60 days).
export async function getLongLivedFacebookToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         process.env.FACEBOOK_APP_ID!,
    client_secret:     process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Facebook long-lived token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export interface FacebookPage {
  id:           string
  name:         string
  access_token: string
}

// Returns pages the user manages, each with their own page access token.
// Page access tokens derived from a long-lived user token do not expire.
export async function fetchFacebookPages(
  userAccessToken: string,
): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    fields:       'id,name,access_token',
    access_token: userAccessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/me/accounts?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch Facebook pages (${res.status})`)
  const json = await res.json()
  return (json.data as FacebookPage[]) ?? []
}

// Publishes a text post to a Facebook Page. Returns the new post ID.
export async function postToFacebookPage(
  pageAccessToken: string,
  pageId: string,
  message: string,
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    message,
    access_token: pageAccessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Facebook post failed (${res.status}): ${body}`) as Error & { status: number; body: string }
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}
