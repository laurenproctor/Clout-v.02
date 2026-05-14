// WordPress REST API helpers — credential-based (Application Passwords, WP 5.6+)

export function normalizeWpUrl(raw: string): string {
  let url = raw.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url.replace(/\/+$/, '')
}

function basicAuthHeader(username: string, appPassword: string): string {
  return 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64')
}

export async function validateWordPressCredentials(
  siteUrl: string,
  username: string,
  appPassword: string,
): Promise<{ siteName: string }> {
  let meRes: Response
  try {
    meRes = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        Authorization: basicAuthHeader(username, appPassword),
        'Content-Type': 'application/json',
      },
    })
  } catch {
    throw Object.assign(new Error('unreachable'), { code: 'unreachable' })
  }

  if (meRes.status === 401 || meRes.status === 403) {
    throw Object.assign(new Error('invalid_credentials'), { code: 'invalid_credentials' })
  }

  if (!meRes.ok) {
    throw Object.assign(new Error('unreachable'), { code: 'unreachable' })
  }

  // Fetch the site name from the root endpoint
  let siteName = siteUrl
  try {
    const rootRes = await fetch(`${siteUrl}/wp-json/`, {
      headers: { Authorization: basicAuthHeader(username, appPassword) },
    })
    if (rootRes.ok) {
      const root = await rootRes.json() as { name?: string }
      if (root.name) siteName = root.name
    }
  } catch {
    // non-fatal — fall back to URL as label
  }

  return { siteName }
}

export async function createWordPressPost(
  siteUrl: string,
  username: string,
  appPassword: string,
  post: { title: string; content: string; status?: 'publish' | 'draft' },
): Promise<{ postId: string; postUrl: string }> {
  const res = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: post.title ?? '',
      content: post.content,
      status: post.status ?? 'publish',
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw Object.assign(
      new Error(body.message ?? `WordPress API error: ${res.status}`),
      { code: res.status === 401 || res.status === 403 ? 'token_expired' : 'publish_failed', retryable: res.status >= 500 }
    )
  }

  const data = await res.json() as { id: number; link: string }
  return { postId: String(data.id), postUrl: data.link }
}
