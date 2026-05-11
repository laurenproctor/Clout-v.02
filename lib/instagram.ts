// lib/instagram.ts
// Server-side only. Never import from client components.
// Meta Instagram Graph API: https://developers.facebook.com/docs/instagram-api
// Required env vars: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
//
// NOTE: The Instagram Content Publishing API requires a Business or Creator account
// linked to a Facebook Page. Text-only posts are not supported — image or video
// media is required. This module handles OAuth and credential storage only.
// Posting support will be added when media upload is implemented.

const GRAPH_BASE = 'https://graph.facebook.com/v20.0'
const IG_SCOPES = 'instagram_basic,instagram_content_publish,pages_show_list'

export function buildInstagramAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_APP_ID!,
    redirect_uri:  redirectUri,
    scope:         IG_SCOPES,
    state,
    response_type: 'code',
  })
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`
}

export async function exchangeInstagramCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    redirect_uri:  redirectUri,
    code,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram code exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function getLongLivedInstagramToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         process.env.INSTAGRAM_APP_ID!,
    client_secret:     process.env.INSTAGRAM_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram long-lived token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export interface InstagramAccount {
  id:       string
  username: string
  name:     string
}

// Finds the first Instagram Business Account linked to any of the user's Facebook Pages.
export async function fetchInstagramAccount(
  userAccessToken: string,
): Promise<InstagramAccount | null> {
  const params = new URLSearchParams({
    fields:       'instagram_business_account{id,username,name}',
    access_token: userAccessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/me/accounts?${params}`)
  if (!res.ok) return null
  const json = await res.json()
  const pages = (json.data as Array<{ instagram_business_account?: InstagramAccount }>) ?? []
  return pages.find(p => p.instagram_business_account)?.instagram_business_account ?? null
}
