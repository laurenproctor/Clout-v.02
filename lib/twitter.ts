// lib/twitter.ts
// Server-side only. Never import from client components.

const OAUTH_BASE = 'https://twitter.com/i/oauth2'
const API_BASE   = 'https://api.twitter.com'

export const TWITTER_SCOPES = 'tweet.read tweet.write users.read offline.access'

export function buildTwitterAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.X_CLIENT_ID!,
    redirect_uri:          redirectUri,
    scope:                 TWITTER_SCOPES,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${OAUTH_BASE}/authorize?${params}`
}

export async function exchangeTwitterCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID!}:${process.env.X_CLIENT_SECRET!}`
  ).toString('base64')

  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      Authorization:   `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      code_verifier: codeVerifier,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Twitter token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export interface TwitterUser {
  id: string
  name: string
  username: string
}

export async function fetchTwitterUser(accessToken: string): Promise<TwitterUser> {
  const res = await fetch(`${API_BASE}/2/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch Twitter user (${res.status})`)
  const json = await res.json()
  return json.data as TwitterUser
}

// PKCE helpers

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(digest).toString('base64url')
}
