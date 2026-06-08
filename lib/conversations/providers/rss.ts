import { scrapeBlog } from '@/lib/competitors/scrapers/blog'
import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

export class RSSProvider implements ConversationProvider {
  sourceType = 'rss' as const

  canHandle(url: string): boolean {
    try {
      const { pathname } = new URL(url)
      return pathname.endsWith('.xml') || pathname.endsWith('/feed') ||
        pathname.endsWith('/rss') || pathname.endsWith('.rss') ||
        pathname.endsWith('/atom.xml') || pathname.includes('/feed.xml')
    } catch { return false }
  }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
    const { hostname } = new URL(sourceUrl)
    const posts = await scrapeBlog(hostname, sourceUrl, { maxPosts: 15 })
    return posts.map(p => ({
      externalId: p.external_id,
      contentHash: contentHash(p.url),
      canonicalUrl: p.url,
      contentType: 'article' as const,
      title: p.title,
      author: null,
      authorUrl: null,
      publication: hostname,
      sourceUrl: p.url,
      excerpt: p.content.slice(0, 300) || null,
      bodyMarkdown: p.content || null,
      heroImage: null,
      publishedAt: p.published_at,
      metadata: { feedUrl: sourceUrl },
    }))
  }
}
