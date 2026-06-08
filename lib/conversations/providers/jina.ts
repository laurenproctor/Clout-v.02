import { fetchWithJina } from '@/lib/scraper/jina'
import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

export class JinaProvider implements ConversationProvider {
  sourceType = 'generic' as const

  canHandle(_url: string): boolean {
    return true // fallback for single-article URLs
  }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
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
        publication: new URL(sourceUrl).hostname,
        sourceUrl: canonical,
        excerpt: article.markdownContent.slice(0, 300) || null,
        bodyMarkdown: article.markdownContent,
        heroImage: null,
        publishedAt: article.publishedAt ?? null,
        metadata: { wordCount: article.wordCount },
      }]
    } catch {
      return []
    }
  }
}
