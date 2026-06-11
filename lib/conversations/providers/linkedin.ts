import { fetchWithJina } from '@/lib/scraper/jina'
import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

const MIN_REACTIONS  = 5
const MIN_BODY_CHARS = 50
const MAX_BODY_CHARS = 20_000
const MAX_POSTS      = 10

const AUTH_WALL_SIGNALS = ['Join LinkedIn', 'Sign in to LinkedIn', 'authwall']

type LinkedInMode = 'post' | 'company' | 'profile'

// ─── URL helpers ───────────────────────────────────────────────────────────

function detectMode(pathname: string): LinkedInMode {
  if (pathname.startsWith('/posts/')) return 'post'
  if (pathname.startsWith('/company/')) return 'company'
  return 'profile'
}

function reliabilityTier(mode: LinkedInMode): 'high' | 'medium' | 'low' {
  if (mode === 'post')    return 'high'
  if (mode === 'company') return 'medium'
  return 'low'
}

function buildJinaUrl(sourceUrl: string, mode: LinkedInMode): string {
  try {
    const u = new URL(sourceUrl)
    u.hostname = 'www.linkedin.com'

    if (mode === 'profile') {
      // Strip to /in/{username} then add recent-activity
      const slug = u.pathname.match(/^\/in\/([^/]+)/)?.[1] ?? ''
      return `https://www.linkedin.com/in/${slug}/recent-activity/shares/`
    }
    if (mode === 'company') {
      const slug = u.pathname.match(/^\/company\/([^/]+)/)?.[1] ?? ''
      return `https://www.linkedin.com/company/${slug}/posts/`
    }
    return u.toString()
  } catch {
    return sourceUrl
  }
}

// ─── Engagement parsing ────────────────────────────────────────────────────

function parseCount(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern)
  if (!m) return null
  const raw = m[1].replace(/,/g, '')
  if (raw.endsWith('K')) return Math.round(parseFloat(raw) * 1000)
  if (raw.endsWith('M')) return Math.round(parseFloat(raw) * 1_000_000)
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

function parseEngagement(markdown: string) {
  const reactionCount = parseCount(markdown, /(\d[\d,KM]*)\s*(?:reactions?|likes?)/i)
  const commentCount  = parseCount(markdown, /(\d[\d,KM]*)\s*comments?/i)
  return { reactionCount, commentCount }
}

// ─── Author extraction from markdown ──────────────────────────────────────

function parseAuthor(markdown: string): { authorName: string | null; authorUrl: string | null } {
  const urlMatch = markdown.match(/\[([^\]]+)\]\((https?:\/\/(?:www\.)?linkedin\.com\/in\/[^)]+)\)/)
  if (urlMatch) return { authorName: urlMatch[1], authorUrl: urlMatch[2] }
  return { authorName: null, authorUrl: null }
}

// ─── Item builder ──────────────────────────────────────────────────────────

function buildItem(
  block: string,
  sourceUrl: string,
  mode: LinkedInMode,
  index: number,
  publishedAt: string | undefined,
): NormalizedItem {
  const now         = new Date().toISOString()
  const body        = block.slice(0, MAX_BODY_CHARS)
  const titleLine   = block.split('\n').find(l => l.trim().length > 0) ?? ''
  const title       = titleLine.replace(/^#+\s*/, '').slice(0, 120) || null
  const { reactionCount, commentCount } = parseEngagement(block)
  const { authorName, authorUrl }       = parseAuthor(block)

  const itemUrl     = `${sourceUrl}#item-${index}`
  const canonical   = contentHash(itemUrl)

  return {
    externalId:   canonical,
    contentHash:  contentHash(itemUrl),
    canonicalUrl: itemUrl,
    contentType:  'post' as const,
    title,
    author:       authorName,
    authorUrl,
    publication:  sourceUrl,
    sourceUrl:    mode === 'post' ? sourceUrl : itemUrl,
    excerpt:      body.slice(0, 300) || null,
    bodyMarkdown: body || null,
    heroImage:    null,
    publishedAt:  publishedAt ?? null,
    metadata: {
      linkedinId:               canonical,
      authorType:               mode === 'company' ? 'company' : 'person',
      authorName,
      authorUrl,
      reactionCount,
      commentCount,
      repostCount:              null,
      engagementScore:          (reactionCount ?? 0) + (commentCount ?? 0) * 3,
      permalink:                sourceUrl,
      discoveredFromSource:     sourceUrl,
      reliabilityTier:          reliabilityTier(mode),
      linkedinEngagementUnknown: reactionCount === null,
      sourceMode:               'public',
      authWallDetected:         false,
      itemsExtracted:           0,  // will be updated after all items known
      lastSuccessfulIngest:     now,
      ingestedAt:               now,
      firstSeenAt:              now,
    },
  } satisfies NormalizedItem
}

// ─── Provider ─────────────────────────────────────────────────────────────

export class LinkedInProvider implements ConversationProvider {
  sourceType = 'linkedin' as const

  canHandle(url: string): boolean {
    try {
      const { hostname, pathname } = new URL(url)
      if (hostname !== 'linkedin.com' && hostname !== 'www.linkedin.com') return false
      return pathname.startsWith('/in/') || pathname.startsWith('/company/') || pathname.startsWith('/posts/')
    } catch {
      return false
    }
  }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
    const { pathname } = new URL(sourceUrl)
    const mode         = detectMode(pathname)
    const jinaUrl      = buildJinaUrl(sourceUrl, mode)

    let scraped
    try {
      scraped = await fetchWithJina(jinaUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[LinkedInProvider] Jina fetch failed:', msg, { sourceUrl })
      throw err  // let pipeline mark source as failed
    }

    const markdown = scraped.markdownContent ?? ''

    // Detect LinkedIn auth wall
    const authWall = AUTH_WALL_SIGNALS.some(s => markdown.includes(s))
    if (authWall) {
      console.info('[LinkedInProvider] auth wall detected', { sourceUrl, mode })
      return []
    }

    let items: NormalizedItem[]

    if (mode === 'post') {
      // Single-post mode: treat entire markdown as one item
      if (markdown.length < MIN_BODY_CHARS) {
        console.info('[LinkedInProvider] post too short, skipping', { sourceUrl })
        return []
      }
      const item = buildItem(markdown, sourceUrl, mode, 0, scraped.publishedAt)
      items = [item]
    } else {
      // Multi-post mode: split on horizontal rules or heading separators
      const blocks = markdown
        .split(/\n---\n|\n\*\*\*\n|\n={3,}\n/)
        .map(b => b.trim())
        .filter(b => b.length >= MIN_BODY_CHARS)

      items = blocks
        .slice(0, MAX_POSTS)
        .map((block, i) => buildItem(block, sourceUrl, mode, i, scraped.publishedAt))

      // Apply engagement filter when counts are parseable
      items = items.filter(item => {
        const meta = item.metadata as Record<string, unknown>
        const r = meta.reactionCount as number | null
        if (r === null) return true  // unknown engagement — don't filter
        return r >= MIN_REACTIONS
      })
    }

    // Back-fill itemsExtracted now that we know the count
    const count = items.length
    for (const item of items) {
      (item.metadata as Record<string, unknown>).itemsExtracted = count
    }

    console.info('[LinkedInProvider]', {
      sourceUrl,
      mode,
      reliabilityTier: reliabilityTier(mode),
      itemsExtracted: count,
      authWall: false,
    })

    return items
  }
}
