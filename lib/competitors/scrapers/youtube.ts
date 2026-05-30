import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

const YT = 'https://www.googleapis.com/youtube/v3'

type ChannelRef =
  | { via: 'id';     value: string }
  | { via: 'handle'; value: string }
  | { via: 'user';   value: string }

function parseChannelUrl(url: string): ChannelRef | null {
  const parts = urlParts(url)
  if (!parts.length) return null
  if (parts[0] === 'channel' && parts[1]) return { via: 'id',     value: parts[1] }
  if (parts[0] === 'user'    && parts[1]) return { via: 'user',   value: parts[1] }
  if (parts[0]?.startsWith('@'))          return { via: 'handle', value: parts[0] }
  return null
}

async function resolveChannelId(ref: ChannelRef, apiKey: string): Promise<string | null> {
  if (ref.via === 'id') return ref.value
  const p = new URLSearchParams({ part: 'id', key: apiKey })
  if (ref.via === 'handle') p.set('forHandle', ref.value)
  if (ref.via === 'user')   p.set('forUsername', ref.value)
  const res = await fetch(`${YT}/channels?${p}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  return (await res.json())?.items?.[0]?.id ?? null
}

export async function scrapeYouTube(channelUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) { console.warn('[youtube] YOUTUBE_API_KEY not set'); return [] }

  const ref = parseChannelUrl(channelUrl)
  if (!ref) return []

  const channelId = await resolveChannelId(ref, apiKey)
  if (!channelId) return []

  const chanRes = await fetch(
    `${YT}/channels?${new URLSearchParams({ part: 'contentDetails', id: channelId, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!chanRes.ok) return []
  const uploadsId = (await chanRes.json())?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  const plRes = await fetch(
    `${YT}/playlistItems?${new URLSearchParams({
      part: 'snippet', playlistId: uploadsId,
      maxResults: String(opts.maxPosts ?? 10), key: apiKey,
    })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!plRes.ok) return []
  const items: Array<{
    snippet: {
      resourceId: { videoId: string }
      title: string
      publishedAt: string
      thumbnails: { medium?: { url: string }; default?: { url: string } }
    }
  }> = (await plRes.json())?.items ?? []
  if (!items.length) return []

  const videoIds = items.map(i => i.snippet.resourceId.videoId).join(',')
  const statsMap: Record<string, { viewCount?: string; likeCount?: string; commentCount?: string }> = {}
  const statsRes = await fetch(
    `${YT}/videos?${new URLSearchParams({ part: 'statistics', id: videoIds, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (statsRes.ok) {
    for (const v of (await statsRes.json())?.items ?? []) statsMap[v.id] = v.statistics
  }

  return items.map(item => {
    const videoId = item.snippet.resourceId.videoId
    const s = statsMap[videoId] ?? {}
    return {
      external_id:   videoId,
      title:         item.snippet.title,
      content:       item.snippet.title,
      url:           `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
      published_at:  item.snippet.publishedAt,
      metrics: {
        views:    s.viewCount    ? parseInt(s.viewCount)    : undefined,
        likes:    s.likeCount    ? parseInt(s.likeCount)    : undefined,
        comments: s.commentCount ? parseInt(s.commentCount) : undefined,
      },
    }
  })
}
