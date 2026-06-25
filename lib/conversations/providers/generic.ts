import { scrapeBlog } from '@/lib/competitors/scrapers/blog'
import { fetchWithJina } from '@/lib/scraper/jina'
import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

export class GenericArticleProvider implements ConversationProvider {
  sourceType = 'generic' as const

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implements ConversationProvider.canHandle signature
  canHandle(_url: string): boolean { return true }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
    const { hostname } = new URL(sourceUrl)

    // 1. Try RSS discovery via scrapeBlog
    const rssItems = await scrapeBlog(hostname, null, { maxPosts: 15 })
    if (rssItems.length > 0) {
      return rssItems.map(p => ({
        externalId: p.external_id,
        contentHash: contentHash(p.url),
        canonicalUrl: p.url,
        contentType: 'article' as const,
        title: p.title ?? null,
        author: null,
        authorUrl: null,
        publication: hostname,
        sourceUrl: p.url,
        excerpt: p.content.slice(0, 300) || null,
        bodyMarkdown: p.content || null,
        heroImage: null,
        publishedAt: p.published_at,
        metadata: { discovered: true },
      }))
    }

    // 2. Jina fallback: treat sourceUrl as a single article
    try {
      const article = await fetchWithJina(sourceUrl)
      if (!article.markdownContent) return []
      const canonical = article.url ?? sourceUrl
      return [{
        externalId: canonical,
        contentHash: contentHash(canonical),
        canonicalUrl: canonical,
        contentType: 'article' as const,
        title: article.title ?? null,
        author: null,
        authorUrl: null,
        publication: hostname,
        sourceUrl: canonical,
        excerpt: article.markdownContent.slice(0, 300) || null,
        bodyMarkdown: article.markdownContent,
        heroImage: null,
        publishedAt: article.publishedAt ?? null,
        metadata: { jinaFallback: true, wordCount: article.wordCount },
      }]
    } catch {
      return []
    }
  }
}
