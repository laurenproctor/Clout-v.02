import { scrapeBlog } from '@/lib/competitors/scrapers/blog'
import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

export class SubstackProvider implements ConversationProvider {
  sourceType = 'substack' as const

  canHandle(url: string): boolean {
    try { return new URL(url).hostname.endsWith('.substack.com') } catch { return false }
  }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
    const { hostname } = new URL(sourceUrl)
    const rssUrl = `https://${hostname}/feed`
    const posts = await scrapeBlog(hostname, rssUrl, { maxPosts: 15 })
    return posts.map(p => {
      const canonical = p.url
      const isNote = p.url.includes('/note/') || p.url.includes('/notes/')
      return {
        externalId: p.external_id,
        contentHash: contentHash(canonical),
        canonicalUrl: canonical,
        contentType: isNote ? ('note' as const) : ('article' as const),
        title: p.title,
        author: null,
        authorUrl: null,
        publication: hostname.replace('.substack.com', ''),
        sourceUrl: p.url,
        excerpt: p.content.slice(0, 300) || null,
        bodyMarkdown: p.content || null,
        heroImage: null,
        publishedAt: p.published_at,
        metadata: { hostname },
      }
    })
  }
}
