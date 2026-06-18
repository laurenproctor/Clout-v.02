import { fetchHtml } from './fetchUrl'
import { isSubstack, extractSubstack, fetchSubstackApi } from './substack'
import { extractWithReadability } from './readability'
import { sanitizeHtml } from './sanitize'
import { toMarkdown } from './markdown'
import { fetchWithJina } from './jina'
import { ExtractionError } from './errors'
import type { ScrapedArticle } from './types'

export async function scrapeUrl(url: string): Promise<ScrapedArticle> {
  let html: string
  try {
    html = await fetchHtml(url)
  } catch (err) {
    // Any recoverable fetch failure gets one more chance via Jina Reader, which
    // uses a different network path and egress IP: 403 bot-blocks (FETCH_BLOCKED),
    // Cloudflare-style bad statuses (FETCH_FAILED), timeouts (FETCH_TIMEOUT), and
    // connection-level failures (FETCH_UNREACHABLE) that undici raises as a bare
    // TypeError from datacenter IPs. Only a malformed URL is truly unrecoverable.
    if (err instanceof Error && err.message.startsWith('FETCH_FAILED: Malformed URL')) {
      throw err
    }
    try {
      return await fetchWithJina(url)
    } catch (jinaErr) {
      // Jina is the last resort; if it also fails, surface the ORIGINAL fetch
      // failure when it's more specific (unreachable host / timeout) so the user
      // gets an honest message rather than a generic Jina error.
      if (err instanceof Error && (
        err.message.startsWith('FETCH_UNREACHABLE') ||
        err.message.startsWith('FETCH_TIMEOUT')
      )) {
        throw err
      }
      throw jinaErr
    }
  }

  const substack = isSubstack(url, html)

  let extracted: Awaited<ReturnType<typeof extractWithReadability>>

  if (substack) {
    // Try Substack API first — returns clean JSON, bypasses bot protection
    const apiResult = await fetchSubstackApi(url)
    if (apiResult) {
      extracted = apiResult
    } else {
      // Fall back to HTML extraction
      try {
        extracted = extractSubstack(html)
      } catch {
        extracted = await extractWithReadability(html, url)
      }
    }
  } else {
    try {
      extracted = await extractWithReadability(html, url)
    } catch (err) {
      if (err instanceof ExtractionError) {
        console.warn(`[scraper] readability extraction failed for ${url}, falling back to Jina`)
        return fetchWithJina(url)
      }
      throw err
    }
  }

  const cleanHtml = sanitizeHtml(extracted.html, substack)
  const markdown = toMarkdown(cleanHtml)
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  // Fall back to Jina if readability returned insufficient content (e.g. lazy-loaded SPA)
  if (!substack && wordCount < 30) {
    console.warn(`[scraper] readability returned only ${wordCount} words for ${url}, falling back to Jina`)
    return fetchWithJina(url)
  }

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
    extractionMethod: 'readability' as const,
  }
}
