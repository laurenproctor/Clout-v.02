// lib/providers/x/client.ts
// Server-side only. Never import from client components.

import { createHash, randomBytes } from 'crypto'

const OAUTH_BASE = 'https://twitter.com/i/oauth2'
const TOKEN_URL  = 'https://api.twitter.com/2/oauth2/token'
const API_BASE   = 'https://api.twitter.com/2'

export function buildXAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.X_CLIENT_ID!,
    redirect_uri:          redirectUri,
    scope:                 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${OAUTH_BASE}/authorize?${params}`
}

export function generateCodeVerifier(): string {
  return randomBytes(64).toString('base64url')
}

export function deriveCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export async function exchangeXCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID!}:${process.env.X_CLIENT_SECRET!}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
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
    throw new Error(`X token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function refreshXToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID!}:${process.env.X_CLIENT_SECRET!}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`X token refresh failed (${res.status}): ${text}`)
  }
  return res.json()
}

export interface XProfile {
  id:       string   // numeric string — stored as account_id
  name:     string
  username: string   // handle without @
}

export async function fetchXProfile(accessToken: string): Promise<XProfile> {
  const res = await fetch(`${API_BASE}/users/me?user.fields=name,username`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch X profile (${res.status})`)
  const json = await res.json()
  return json.data as XProfile
}

/** Post a single tweet. Returns the tweet ID. */
export async function postTweet(
  accessToken: string,
  text: string,
  replyToId?: string
): Promise<string> {
  const body: Record<string, unknown> = { text }
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId }

  const res = await fetch(`${API_BASE}/tweets`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`X tweet failed (${res.status}): ${detail}`)
  }
  const json = await res.json()
  return (json.data as { id: string }).id
}

/** Post a thread (array of tweet texts). Returns the first tweet ID. */
export async function postThread(
  accessToken: string,
  tweets: string[]
): Promise<string> {
  if (tweets.length === 0) throw new Error('No tweets to post')
  let firstId: string | null = null
  let prevId:  string | null = null

  for (const text of tweets) {
    const id = await postTweet(accessToken, text, prevId ?? undefined)
    if (!firstId) firstId = id
    prevId = id
  }

  return firstId!
}

/** Derive the public X post URL from a tweet ID. */
export function xPostUrl(tweetId: string): string {
  return `https://x.com/i/web/status/${tweetId}`
}
