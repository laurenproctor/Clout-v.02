import { createHash } from 'crypto'

export function contentHash(url: string): string {
  return createHash('sha256')
    .update(normalizeUrl(url))
    .digest('hex')
    .slice(0, 64)
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    for (const p of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source']) {
      u.searchParams.delete(p)
    }
    return u.origin + u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '')
  } catch {
    return url
  }
}
