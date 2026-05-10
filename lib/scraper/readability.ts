import type { ExtractionResult } from './types'

export async function extractWithReadability(html: string, url: string): Promise<ExtractionResult> {
  // Dynamic imports keep jsdom and readability out of the webpack bundle
  const { JSDOM } = await import('jsdom')
  const { Readability } = await import('@mozilla/readability')

  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('EXTRACTION_FAILED: Readability could not parse content')
  }

  return {
    title: article.title ?? '',
    author: article.byline ?? undefined,
    siteName: article.siteName ?? undefined,
    publishedAt: article.publishedTime ?? undefined,
    html: article.content ?? '',
    excerpt: article.excerpt ?? undefined,
  }
}
