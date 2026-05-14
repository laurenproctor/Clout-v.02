import { PublishingError, PUB_ERROR, classifyWordPressError } from '@/lib/publishing/errors'

export interface WpSiteInfo {
  name: string
  description: string
  url: string
  namespaces: string[]
  gmt_offset?: number
  timezone_string?: string
}

export interface WpPost {
  id: number
  link: string
  status: string
  date: string
  slug: string
}

export interface WpCreatePostInput {
  title: string
  content: string
  excerpt?: string
  slug?: string
  status: 'draft' | 'publish' | 'future'
  date?: string
  categories?: number[]
  tags?: number[]
  featured_media?: number
}

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

async function wpFetch<T>(
  siteUrl: string,
  path: string,
  options: RequestInit & { username: string; password: string },
): Promise<T> {
  const { username, password, headers = {}, ...rest } = options
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json${path}`

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': basicAuth(username, password),
      ...(headers as Record<string, string>),
    },
  })

  if (!res.ok) {
    let wpCode: string | undefined
    let message = `WordPress error (${res.status})`
    try {
      const body = await res.json() as { code?: string; message?: string }
      wpCode  = body.code
      message = body.message ?? message
    } catch { /* non-JSON body */ }
    const { code, retryable } = classifyWordPressError(res.status, wpCode)
    throw new PublishingError(message, code, retryable)
  }

  return res.json() as Promise<T>
}

export async function discoverSite(siteUrl: string): Promise<WpSiteInfo> {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json`
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new PublishingError(
      `Could not reach ${siteUrl}. Check the URL and try again.`,
      PUB_ERROR.CONNECTION_REFUSED, false,
    )
  }

  if (res.status === 404) {
    throw new PublishingError(
      'WordPress REST API not found at this URL. Confirm the site is WordPress 4.7+ with the REST API enabled.',
      PUB_ERROR.REST_NOT_ENABLED, false,
    )
  }
  if (!res.ok) {
    throw new PublishingError(
      `Could not reach WordPress site (${res.status}).`,
      PUB_ERROR.CONNECTION_REFUSED, false,
    )
  }

  const data = await res.json() as WpSiteInfo
  if (!Array.isArray(data.namespaces) || !data.namespaces.includes('wp/v2')) {
    throw new PublishingError(
      'WordPress REST API is not available. Enable it in your WordPress settings.',
      PUB_ERROR.REST_NOT_ENABLED, false,
    )
  }
  return data
}

export async function verifyCredentials(
  siteUrl: string,
  username: string,
  applicationPassword: string,
): Promise<void> {
  await wpFetch<{ id: number }>(siteUrl, '/wp/v2/users/me', {
    method: 'GET',
    username,
    password: applicationPassword,
  })
}

export async function createPost(
  siteUrl: string, username: string, password: string,
  input: WpCreatePostInput,
): Promise<WpPost> {
  return wpFetch<WpPost>(siteUrl, '/wp/v2/posts', {
    method: 'POST', username, password,
    body: JSON.stringify(input),
  })
}

export async function updatePost(
  siteUrl: string, username: string, password: string,
  postId: number, input: Partial<WpCreatePostInput>,
): Promise<WpPost> {
  // WordPress REST uses POST for updates on /posts/{id}
  return wpFetch<WpPost>(siteUrl, `/wp/v2/posts/${postId}`, {
    method: 'POST', username, password,
    body: JSON.stringify(input),
  })
}

export async function deletePost(
  siteUrl: string, username: string, password: string, postId: number,
): Promise<void> {
  await wpFetch<unknown>(siteUrl, `/wp/v2/posts/${postId}?force=true`, {
    method: 'DELETE', username, password,
  })
}
