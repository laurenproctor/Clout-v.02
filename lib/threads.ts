// lib/threads.ts
// Server-side only. Never import from client components.
// Meta Threads API: https://developers.facebook.com/docs/threads

const AUTH_BASE    = 'https://threads.net/oauth'
const GRAPH_BASE   = 'https://graph.threads.net/v1.0'
const THREADS_SCOPES = 'threads_basic,threads_content_publish'

export function buildThreadsAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:    process.env.THREADS_APP_ID!,
    redirect_uri: redirectUri,
    scope:        THREADS_SCOPES,
    response_type: 'code',
    state,
  })
  return `${AUTH_BASE}/authorize?${params}`
}

// Returns a short-lived token (valid 1 hour). Exchange immediately for a long-lived token.
export async function exchangeThreadsCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; user_id: string }> {
  const params = new URLSearchParams({
    client_id:     process.env.THREADS_APP_ID!,
    client_secret: process.env.THREADS_APP_SECRET!,
    grant_type:    'authorization_code',
    redirect_uri:  redirectUri,
    code,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Threads code exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

// Exchange short-lived token for a 60-day long-lived token.
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:        'th_exchange_token',
    client_secret:     process.env.THREADS_APP_SECRET!,
    access_token:      shortLivedToken,
  })
  const res = await fetch(`${GRAPH_BASE}/access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Threads long-lived token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

// Refresh a long-lived token. Call within 24h before expiry.
// Threads does not use a separate refresh_token — the access_token itself is refreshed.
export async function refreshThreadsToken(
  accessToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:   'th_refresh_token',
    access_token: accessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/refresh_access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Threads token refresh failed (${res.status}): ${text}`)
  }
  return res.json()
}

export interface ThreadsProfile {
  id: string
  username: string
  name: string
}

export async function fetchThreadsProfile(accessToken: string): Promise<ThreadsProfile> {
  const params = new URLSearchParams({
    fields:       'id,username,name',
    access_token: accessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/me?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch Threads profile (${res.status})`)
  return res.json()
}

// Step 1 of 2: create a media container. Returns creation_id.
export async function createThreadsTextContainer(
  accessToken: string,
  userId: string,
  text: string,
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    media_type:   'TEXT',
    text,
    access_token: accessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Threads container creation failed (${res.status}): ${body}`) as Error & { status: number; body: string }
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

// Step 2 of 2: publish the container. Returns the published post ID.
export async function publishThreadsContainer(
  accessToken: string,
  userId: string,
  creationId: string,
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    creation_id:  creationId,
    access_token: accessToken,
  })
  const res = await fetch(`${GRAPH_BASE}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Threads publish failed (${res.status}): ${body}`) as Error & { status: number; body: string }
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}
