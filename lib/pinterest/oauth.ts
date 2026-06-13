// lib/pinterest/oauth.ts
// Server-side only. Never import from client components.
// Pinterest OAuth 2.0 (authorization code + refresh token).
// Scopes — start minimal, verified in sandbox before locking:
//   boards:read, pins:read, pins:write, user_accounts:read
// Add boards:write only if a flow actually mutates boards (Phase 1 does not).
import { FEATURES } from '@/lib/features'
import { PinterestApiError, type PinterestProfile, type PinterestTokens } from './types'

const AUTHORIZE_URL = 'https://www.pinterest.com/oauth/'
const SCOPES = 'boards:read,pins:read,pins:write,user_accounts:read'

/** API host switches between sandbox (trial access) and production. */
export function pinterestApiBase(): string {
  return FEATURES.pinterestSandboxMode
    ? 'https://api-sandbox.pinterest.com/v5'
    : 'https://api.pinterest.com/v5'
}

function basicAuthHeader(): string {
  const id = process.env.PINTEREST_CLIENT_ID
  const secret = process.env.PINTEREST_CLIENT_SECRET
  if (!id || !secret) throw new Error('PINTEREST_CLIENT_ID / PINTEREST_CLIENT_SECRET not configured')
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
}

export function buildPinterestAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.PINTEREST_CLIENT_ID!,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    state,
  })
  return `${AUTHORIZE_URL}?${params}`
}

async function requestToken(body: URLSearchParams): Promise<PinterestTokens> {
  const res = await fetch(`${pinterestApiBase()}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new PinterestApiError(`Pinterest token request failed: ${text}`, res.status, 'token_exchange_failed')
  }
  return res.json()
}

export function exchangePinterestCode(code: string, redirectUri: string): Promise<PinterestTokens> {
  return requestToken(new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: redirectUri,
  }))
}

export function refreshPinterestToken(refreshToken: string): Promise<PinterestTokens> {
  return requestToken(new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  }))
}

export async function fetchPinterestProfile(accessToken: string): Promise<PinterestProfile> {
  const res = await fetch(`${pinterestApiBase()}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new PinterestApiError(`Failed to fetch Pinterest profile: ${text}`, res.status, 'profile_fetch_failed')
  }
  const data = await res.json()
  return {
    username:        data.username,
    accountType:     data.account_type,
    profileImageUrl: data.profile_image ?? null,
    websiteUrl:      data.website_url ?? null,
  }
}
