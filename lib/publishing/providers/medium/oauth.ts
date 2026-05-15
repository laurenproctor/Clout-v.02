import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'

const MEDIUM_AUTH_URL  = 'https://medium.com/m/oauth/authorize'
const MEDIUM_TOKEN_URL = 'https://api.medium.com/v1/tokens'
const MEDIUM_SCOPES    = 'basicProfile,publishPost,listPublications'

export interface MediumTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number   // epoch ms
  scopes: string[]
}

export function buildMediumAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.MEDIUM_CLIENT_ID!,
    scope:         MEDIUM_SCOPES,
    state,
    response_type: 'code',
    redirect_uri:  redirectUri,
  })
  return `${MEDIUM_AUTH_URL}?${params.toString()}`
}

export async function exchangeMediumCode(
  code: string,
  redirectUri: string,
): Promise<MediumTokens> {
  const res = await fetch(MEDIUM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.MEDIUM_CLIENT_ID!,
      client_secret: process.env.MEDIUM_CLIENT_SECRET!,
      grant_type:    'authorization_code',
      redirect_uri:  redirectUri,
    }),
  })

  if (!res.ok) {
    throw new PublishingError(
      `Medium token exchange failed (${res.status}). Please try connecting again.`,
      PUB_ERROR.AUTH_FAILED, false,
    )
  }

  const data = await res.json() as {
    access_token?:  string
    refresh_token?: string
    expires_at?:    number
    scope?:         string
    token_type?:    string
    error?:         string
    error_description?: string
  }

  if (!data.access_token || !data.refresh_token) {
    throw new PublishingError(
      data.error_description ?? data.error ?? 'Medium did not return valid tokens.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    data.expires_at ?? (Date.now() + 60 * 24 * 3600 * 1000),
    scopes:       (data.scope ?? MEDIUM_SCOPES).split(','),
  }
}

export async function refreshMediumToken(refreshToken: string): Promise<MediumTokens> {
  const res = await fetch(MEDIUM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.MEDIUM_CLIENT_ID!,
      client_secret: process.env.MEDIUM_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new PublishingError(
      `Medium token refresh failed (${res.status}). Please reconnect your Medium account.`,
      PUB_ERROR.AUTH_FAILED, false,
    )
  }

  const data = await res.json() as {
    access_token?:  string
    refresh_token?: string
    expires_at?:    number
    scope?:         string
    error?:         string
    error_description?: string
  }

  if (!data.access_token || !data.refresh_token) {
    throw new PublishingError(
      data.error_description ?? data.error ?? 'Medium token refresh did not return valid tokens.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    data.expires_at ?? (Date.now() + 60 * 24 * 3600 * 1000),
    scopes:       (data.scope ?? MEDIUM_SCOPES).split(','),
  }
}
