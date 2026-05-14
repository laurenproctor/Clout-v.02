import type { GBPTokenResponse } from './types'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/business.manage',
].join(' ')

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID
  if (!id) throw new Error('GOOGLE_CLIENT_ID is not configured')
  return id
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET is not configured')
  return secret
}

export function buildGBPAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     clientId(),
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    state,
    access_type:   'offline',
    prompt:        'consent', // always request refresh token
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeGBPCode(
  code: string,
  redirectUri: string,
): Promise<GBPTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId(),
      client_secret: clientSecret(),
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GBP token exchange failed (${res.status}): ${body}`)
  }

  return res.json() as Promise<GBPTokenResponse>
}

export async function refreshGBPToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     clientId(),
      client_secret: clientSecret(),
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GBP token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}
