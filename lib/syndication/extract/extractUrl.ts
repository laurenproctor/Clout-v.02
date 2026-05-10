import type { ExtractedContent } from '@/lib/syndicate/types/analysis'
import { scrapeUrl } from '@/lib/scraper'

const MAX_CHARS = 20_000

export async function extractUrl(url: string): Promise<ExtractedContent> {
  const article = await scrapeUrl(url)

  const text = article.markdownContent.slice(0, MAX_CHARS)
  const wordCount = article.wordCount
  const estimatedReadTime = Math.ceil(wordCount / 200)

  if (wordCount < 50) {
    throw new Error('LOW_SIGNAL: Content too short for syndication')
  }

  return {
    url: article.url,
    title: article.title,
    author: article.author,
    siteName: article.siteName,
    publishedAt: article.publishedAt,
    content: text,
    excerpt: article.excerpt ?? text.slice(0, 200),
    sections: [{ text }],
    chunks: [{
      id: 'chunk-0',
      text,
      tokenCount: Math.ceil(text.length / 4),
      order: 0,
    }],
    estimatedReadTime,
  }
}
