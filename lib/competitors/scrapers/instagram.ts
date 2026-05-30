import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

const IG_APP_ID = '936619743392459'
const IG_BASE   = 'https://i.instagram.com/api/v1'

function parseHandle(url: string): string | null {
  const parts = urlParts(url)
  const slug  = parts[0]
  const blocked = new Set(['p', 'explore', 'reel', 'reels', 'stories', 'tv', 'accounts', 'direct'])
  if (!slug || blocked.has(slug)) return null
  return slug.replace(/^@/, '')
}

function igHeaders(sessionId?: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent':  'Instagram 276.0.0.21.105 Android (30/11; 420dpi; 1080x2280; samsung; SM-G991B; o1s; exynos2100; en_US; 453743458)',
    'x-ig-app-id': IG_APP_ID,
    Accept:        '*/*',
  }
  if (sessionId) h.Cookie = `sessionid=${sessionId}`
  return h
}

async function resolveUserId(handle: string, sessionId?: string): Promise<string | null> {
  const res = await fetch(
    `${IG_BASE}/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    { headers: igHeaders(sessionId), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  return (await res.json())?.data?.user?.id ?? null
}

interface IGMedia {
  id: string
  caption?: { text?: string }
  timestamp: number
  like_count?: number
  comment_count?: number
  image_versions2?: { candidates?: Array<{ url: string }> }
  carousel_media?: Array<{ image_versions2?: { candidates?: Array<{ url: string }> } }>
  code?: string
}

export async function scrapeInstagram(profileUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const handle    = parseHandle(profileUrl)
  if (!handle) return []
  const sessionId = process.env.INSTAGRAM_SESSION_ID

  const userId = await resolveUserId(handle, sessionId)
  if (!userId) { console.warn(`[instagram] Could not resolve user ID for @${handle}`); return [] }

  const count = opts.maxPosts ?? 10
  const res   = await fetch(
    `${IG_BASE}/feed/user/${userId}/?count=${count}`,
    { headers: igHeaders(sessionId), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) { console.warn(`[instagram] Feed ${res.status} for @${handle}`); return [] }

  const items: IGMedia[] = (await res.json())?.items ?? []
  return items.slice(0, count).map(item => ({
    external_id:   item.id,
    content:       (item.caption?.text ?? '').slice(0, 500),
    url:           `https://www.instagram.com/p/${item.code ?? item.id}/`,
    thumbnail_url: item.image_versions2?.candidates?.[0]?.url ?? item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url,
    published_at:  new Date(item.timestamp * 1000).toISOString(),
    metrics: {
      likes:    item.like_count    ?? undefined,
      comments: item.comment_count ?? undefined,
    },
  }))
}
