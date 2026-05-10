import { fetchHtml } from './fetchUrl'
import { isSubstack, extractSubstack } from './substack'
import { extractWithReadability } from './readability'
import { sanitizeHtml } from './sanitize'
import { toMarkdown } from './markdown'
import type { ScrapedArticle } from './types'

export async function scrapeUrl(url: string): Promise<ScrapedArticle> {
  const html = await fetchHtml(url)

  const substack = isSubstack(url, html)

  let extracted: Awaited<ReturnType<typeof extractWithReadability>>
  try {
    if (substack) {
      extracted = extractSubstack(html)
    } else {
      extracted = await extractWithReadability(html, url)
    }
  } catch (err) {
    // If custom extractor fails, fall through to Readability
    if (substack) {
      extracted = await extractWithReadability(html, url)
    } else {
      throw err
    }
  }

  const cleanHtml = sanitizeHtml(extracted.html, substack)
  const markdown = toMarkdown(cleanHtml)
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  return {
    url,
    title: extracted.title,
    author: extracted.author,
    siteName: extracted.siteName,
    publishedAt: extracted.publishedAt,
    htmlContent: cleanHtml,
    markdownContent: markdown,
    excerpt: extracted.excerpt,
    wordCount,
  }
}
