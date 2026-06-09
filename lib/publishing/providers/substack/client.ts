// NOTE: Substack has no official publishing API. These are undocumented internal REST
// endpoints discovered via DevTools. Validate payloads in docs/research/substack-api.md
// (Task 0) before each production deployment. Substack may break these without notice.

export class SubstackAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubstackAuthError'
  }
}

export class SubstackApiError extends Error {
  status:    number
  retryable: boolean
  constructor(message: string, status: number, retryable = false) {
    super(message)
    this.name      = 'SubstackApiError'
    this.status    = status
    this.retryable = retryable
  }
}

const SUBSTACK_LOGIN_URL = 'https://substack.com/api/v1/login'
const SUBSTACK_USER_URL  = 'https://substack.com/api/v1/user'

function postUrl(subdomain: string, path = ''): string {
  return `https://${subdomain}.substack.com/api/v1/post${path}`
}

function withSession(sessionCookie: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `connect.sid=${sessionCookie}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  }
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticate(email: string, password: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(SUBSTACK_LOGIN_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      body:     JSON.stringify({ email, password, for_pub: '' }),
      redirect: 'manual',
    })
  } catch {
    throw new SubstackApiError('Could not reach Substack. Check your internet connection.', 0, true)
  }

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    let body: { error?: string; errors?: string[] } = {}
    try { body = await res.json() as typeof body } catch { /* non-JSON */ }
    throw new SubstackAuthError(
      body.errors?.[0] ?? body.error ?? 'Invalid email or password.',
    )
  }
  if (!res.ok && res.status !== 302) {
    throw new SubstackApiError(`Substack login failed (${res.status})`, res.status, res.status >= 500)
  }

  const rawCookie = res.headers.get('set-cookie') ?? ''
  const match = /connect\.sid=([^;,\s]+)/.exec(rawCookie)
  if (!match) {
    throw new SubstackAuthError(
      'Authentication succeeded but no session cookie was returned. The Substack API may have changed.',
    )
  }
  return match[1]
}

// ─── Session verification ─────────────────────────────────────────────────────

export interface SubstackUserInfo {
  id:                   number
  name:                 string
  email:                string
  publicationId:        number | null
  publicationSubdomain: string | null
  publicationName:      string | null
}

export async function verifySession(sessionCookie: string): Promise<SubstackUserInfo> {
  let res: Response
  try {
    res = await fetch(SUBSTACK_USER_URL, withSession(sessionCookie, { method: 'GET' }))
  } catch {
    throw new SubstackApiError('Could not reach Substack.', 0, true)
  }

  if (res.status === 401 || res.status === 403) {
    throw new SubstackAuthError('Session expired or invalid. Please reconnect your Substack account.')
  }
  if (!res.ok) {
    throw new SubstackApiError(`Failed to verify session (${res.status})`, res.status, res.status >= 500)
  }

  const data = await res.json() as {
    id?:                 number
    name?:               string
    email?:              string
    primaryPublication?: { id?: number; subdomain?: string; name?: string }
  }

  return {
    id:                   data.id ?? 0,
    name:                 data.name ?? '',
    email:                data.email ?? '',
    publicationId:        data.primaryPublication?.id ?? null,
    publicationSubdomain: data.primaryPublication?.subdomain ?? null,
    publicationName:      data.primaryPublication?.name ?? null,
  }
}

// ─── Draft management ─────────────────────────────────────────────────────────

export interface SubstackDraftInput {
  title:     string
  body:      string
  subtitle?: string
  subdomain: string
}

export interface SubstackDraftResult {
  id:   number
  slug: string
  url:  string
}

export async function createDraft(
  sessionCookie: string,
  input: SubstackDraftInput,
): Promise<SubstackDraftResult> {
  let res: Response
  try {
    res = await fetch(postUrl(input.subdomain), withSession(sessionCookie, {
      method: 'POST',
      body:   JSON.stringify({
        draft:    true,
        title:    input.title,
        body:     input.body,
        subtitle: input.subtitle ?? '',
        type:     'newsletter',
        audience: 'everyone',
      }),
    }))
  } catch {
    throw new SubstackApiError('Could not reach Substack.', 0, true)
  }

  if (res.status === 401 || res.status === 403) {
    throw new SubstackAuthError('Session expired. Please reconnect your Substack account.')
  }
  if (!res.ok) {
    throw new SubstackApiError(`Failed to create draft (${res.status})`, res.status, res.status >= 500)
  }

  const data = await res.json() as {
    id?:            number
    slug?:          string
    canonical_url?: string
  }

  if (!data.id) {
    throw new SubstackApiError('Draft created but no ID returned — API response unexpected', 200, false)
  }

  const slug = data.slug ?? ''
  return {
    id:  data.id,
    slug,
    url: data.canonical_url ?? `https://${input.subdomain}.substack.com/p/${slug}`,
  }
}

export interface SubstackDraftUpdateInput {
  postId:    number
  subdomain: string
  title?:    string
  body?:     string
  subtitle?: string
}

export async function updateDraft(
  sessionCookie: string,
  input: SubstackDraftUpdateInput,
): Promise<SubstackDraftResult> {
  let res: Response
  try {
    res = await fetch(postUrl(input.subdomain, `/${input.postId}`), withSession(sessionCookie, {
      method: 'PUT',
      body:   JSON.stringify({
        ...(input.title    !== undefined && { title:    input.title }),
        ...(input.body     !== undefined && { body:     input.body }),
        ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
      }),
    }))
  } catch {
    throw new SubstackApiError('Could not reach Substack.', 0, true)
  }

  if (res.status === 401 || res.status === 403) {
    throw new SubstackAuthError('Session expired. Please reconnect your Substack account.')
  }
  if (!res.ok) {
    throw new SubstackApiError(`Failed to update draft (${res.status})`, res.status, res.status >= 500)
  }

  const data = await res.json() as { id?: number; slug?: string; canonical_url?: string }
  const id   = data.id ?? input.postId
  const slug = data.slug ?? ''
  return {
    id,
    slug,
    url: data.canonical_url ?? `https://${input.subdomain}.substack.com/p/${slug}`,
  }
}

export async function deleteDraft(
  sessionCookie: string,
  subdomain: string,
  postId: number,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(postUrl(subdomain, `/${postId}`), withSession(sessionCookie, { method: 'DELETE' }))
  } catch {
    throw new SubstackApiError('Could not reach Substack.', 0, true)
  }

  if (res.status === 401 || res.status === 403) {
    throw new SubstackAuthError('Session expired. Please reconnect your Substack account.')
  }
  if (res.status === 404) return
  if (!res.ok) {
    throw new SubstackApiError(`Failed to delete draft (${res.status})`, res.status, res.status >= 500)
  }
}
