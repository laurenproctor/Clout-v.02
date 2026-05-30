import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

function parsePageSlug(url: string): string | null {
  const parts = urlParts(url)
  const slug = parts[0]
  const blocked = new Set(['sharer', 'dialog', 'login', 'signup', 'photo', 'video', 'share', 'events', 'groups'])
  if (!slug || blocked.has(slug)) return null
  return slug
}

export function parseMbasicPosts(html: string): Array<{
  post_id: string; content: string; url: string; published_at: string; likes: number; comments: number
}> {
  const posts: Array<{ post_id: string; content: string; url: string; published_at: string; likes: number; comments: number }> = []
  const storyRe = /href="\/story\.php\?story_fbid=(\d+)(?:&amp;|&)id=(\d+)"[^>]*>(?:See|View) (?:full )?(?:story|post|more)<\/a>/gi
  const storyMatches = [...html.matchAll(storyRe)]
  if (!storyMatches.length) return posts

  const stories = storyMatches.map(m => ({ fbid: m[1], id: m[2], index: m.index ?? 0 }))

  for (let i = 0; i < stories.length; i++) {
    const { fbid, id, index } = stories[i]
    const end   = stories[i + 1]?.index ?? html.length
    const chunk = html.slice(Math.max(0, index - 3000), end)

    const textMatches = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    const content = textMatches
      .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim())
      .filter(t => t.length > 20)
      .join(' ')
      .slice(0, 500)
    if (!content) continue

    const abbrM = chunk.match(/<abbr[^>]*data-store="([^"]+)"/)
    const ms = abbrM ? (() => { try { return JSON.parse(decodeURIComponent(abbrM[1])).time * 1000 } catch { return null } })() : null
    const published_at = ms ? new Date(ms).toISOString() : new Date().toISOString()

    const likesM   = chunk.match(/(\d[\d,]*)\s*(?:people\s+)?(?:reacted|likes?)/i)
    const commentM = chunk.match(/(\d[\d,]*)\s*comments?/i)
    posts.push({
      post_id:      fbid,
      content,
      url:          `https://www.facebook.com/story.php?story_fbid=${fbid}&id=${id}`,
      published_at,
      likes:    likesM   ? parseInt(likesM[1].replace(/,/g, ''))   : 0,
      comments: commentM ? parseInt(commentM[1].replace(/,/g, '')) : 0,
    })
  }
  return posts
}

export async function scrapeFacebook(pageUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const slug = parsePageSlug(pageUrl)
  if (!slug) return []

  const res = await fetch(`https://mbasic.facebook.com/${slug}`, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:            'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []

  const html   = await res.text()
  const parsed = parseMbasicPosts(html)
  return parsed.slice(0, opts.maxPosts ?? 10).map(p => ({
    external_id:  p.post_id,
    content:      p.content,
    url:          p.url,
    published_at: p.published_at,
    metrics: {
      likes:    p.likes    || undefined,
      comments: p.comments || undefined,
    },
  }))
}
