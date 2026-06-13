import { isUnipileKilled } from './killswitch'

// Thin wrapper over the Unipile REST API. Every outbound call passes through
// unipileFetch(), which enforces the admin kill switch first — so there is exactly
// one chokepoint for "stop all connector traffic". Auth is a static X-API-KEY header
// against the workspace's DSN (UNIPILE_DSN), e.g. https://api8.unipile.com:13443.

const TIMEOUT_MS = 15_000

export class UnipileError extends Error {
  constructor(message: string, public readonly status?: number, public readonly body?: unknown) {
    super(message)
    this.name = 'UnipileError'
  }
}

export class UnipileKilledError extends Error {
  constructor() {
    super('Unipile connector is disabled by the admin kill switch')
    this.name = 'UnipileKilledError'
  }
}

function config(): { apiKey: string; dsn: string } {
  const apiKey = process.env.UNIPILE_API_KEY
  const dsn = process.env.UNIPILE_DSN
  if (!apiKey || !dsn) {
    throw new UnipileError('UNIPILE_API_KEY and UNIPILE_DSN must be configured')
  }
  return { apiKey, dsn: dsn.replace(/\/$/, '') }
}

async function unipileFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (await isUnipileKilled()) throw new UnipileKilledError()

  const { apiKey, dsn } = config()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${dsn}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'X-API-KEY': apiKey,
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    })

    const text = await res.text()
    const body = text ? safeJson(text) : null

    if (!res.ok) {
      throw new UnipileError(`Unipile ${path} failed: HTTP ${res.status}`, res.status, body)
    }
    return body as T
  } finally {
    clearTimeout(timeout)
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return text }
}

// ── Hosted authentication ───────────────────────────────────────────────────

export interface HostedAuthLinkParams {
  name: string              // signed correlation token (see lib/unipile/link-token)
  notifyUrl: string
  successUrl: string
  failureUrl: string
  expiresOn: string         // ISO 8601
}

// Creates a hosted-auth wizard URL the user is redirected to. Unipile calls notifyUrl
// (server-to-server) with { status, account_id, name } once the user finishes.
export async function createHostedAuthLink(params: HostedAuthLinkParams): Promise<{ url: string }> {
  const { dsn } = config()
  const res = await unipileFetch<{ url: string }>('/api/v1/hosted/accounts/link', {
    method: 'POST',
    body: JSON.stringify({
      type: 'create',
      providers: ['LINKEDIN'],
      api_url: dsn,
      name: params.name,
      notify_url: params.notifyUrl,
      success_redirect_url: params.successUrl,
      failure_redirect_url: params.failureUrl,
      expiresOn: params.expiresOn,
    }),
  })
  if (!res?.url) throw new UnipileError('Unipile hosted-auth response missing url', undefined, res)
  return res
}

// ── Accounts ────────────────────────────────────────────────────────────────

export interface UnipileAccount {
  id: string
  name?: string
  type?: string
}

// Fetches a connected account — used to confirm a notify webhook corresponds to a
// real, still-connected account before trusting it.
export async function getAccount(accountId: string): Promise<UnipileAccount> {
  return unipileFetch<UnipileAccount>(`/api/v1/accounts/${encodeURIComponent(accountId)}`)
}

// ── LinkedIn posts & comments (read-only monitoring) ────────────────────────

export interface UnipilePostAuthor {
  name?: string
  headline?: string
  public_identifier?: string
  is_company?: boolean
}

export interface UnipilePost {
  id: string
  social_id: string          // urn:li:activity:… — the reliable engagement key
  share_url?: string
  text?: string
  author?: UnipilePostAuthor
  reaction_counter?: number
  comment_counter?: number
  parsed_datetime?: string
}

export interface UnipileComment {
  id: string
  social_id?: string
  text?: string
  author?: UnipilePostAuthor
  reaction_counter?: number
  parsed_datetime?: string
}

export interface SearchPostsOptions {
  datePosted?: string        // e.g. 'past_week', 'past_24h', 'past_month'
  limit?: number
}

// Unipile responses wrap results in `items`; be defensive about the envelope.
function asItems<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[]
  const items = (body as { items?: unknown })?.items
  return Array.isArray(items) ? (items as T[]) : []
}

// Read-only keyword search of LinkedIn posts via a connected account.
export async function searchPosts(
  accountId: string,
  keywords: string,
  opts: SearchPostsOptions = {},
): Promise<UnipilePost[]> {
  const body = await unipileFetch<unknown>(
    `/api/v1/linkedin/search?account_id=${encodeURIComponent(accountId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        api: 'classic',
        category: 'posts',
        keywords,
        sort_by: 'date',
        date_posted: opts.datePosted ?? 'past_week',
        ...(opts.limit ? { limit: opts.limit } : {}),
      }),
    },
  )
  return asItems<UnipilePost>(body)
}

// Read-only listing of comments on a post (by its social_id).
export async function listPostComments(
  accountId: string,
  socialId: string,
): Promise<UnipileComment[]> {
  const body = await unipileFetch<unknown>(
    `/api/v1/posts/${encodeURIComponent(socialId)}/comments?account_id=${encodeURIComponent(accountId)}`,
  )
  return asItems<UnipileComment>(body)
}
