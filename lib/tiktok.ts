// lib/tiktok.ts
// Server-side only. Never import from client components.
// TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started
// Required env vars: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
//
// NOTE: TikTok's Content Posting API supports video uploads only.
// This module handles OAuth and credential storage. Post support will be
// added when video upload is implemented.

const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth'
const TIKTOK_API_BASE  = 'https://open.tiktokapis.com/v2'
const TIKTOK_SCOPES    = 'user.info.basic,video.upload'

export function buildTikTokAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    client_key:            process.env.TIKTOK_CLIENT_KEY!,
    scope:                 TIKTOK_SCOPES,
    response_type:         'code',
    redirect_uri:          redirectUri,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${TIKTOK_AUTH_BASE}/authorize?${params}`
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number; open_id: string }> {
  const res = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  redirectUri,
      code_verifier: codeVerifier,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TikTok token exchange failed (${res.status}): ${text}`)
  }
  const json = await res.json()
  return json.data as { access_token: string; refresh_token: string; expires_in: number; open_id: string }
}

export async function refreshTikTokToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TikTok token refresh failed (${res.status}): ${text}`)
  }
  const json = await res.json()
  return json.data as { access_token: string; refresh_token: string; expires_in: number }
}

export interface TikTokUser {
  open_id:      string
  display_name: string
  avatar_url:   string
}

export async function fetchTikTokUser(accessToken: string): Promise<TikTokUser> {
  const res = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch TikTok user (${res.status})`)
  const json = await res.json()
  return json.data.user as TikTokUser
}

// PKCE helpers — TikTok requires S256 code challenge like Twitter OAuth 2.0
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data    = encoder.encode(verifier)
  const digest  = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(digest).toString('base64url')
}
