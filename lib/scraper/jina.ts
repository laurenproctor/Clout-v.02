import type { ScrapedArticle } from './types'

const JINA_BASE = 'https://r.jina.ai'
const TIMEOUT_MS = 20_000

function parseJinaMarkdown(raw: string, originalUrl: string): ScrapedArticle {
  // Jina returns a preamble block then the article body.
  // Example header lines:
  //   Title: Some Article Title
  //   URL Source: https://...
  //   Published Time: 2024-01-01T00:00:00Z
  //
  // The header ends at the first blank line after the preamble.

  let title = ''
  let publishedAt: string | undefined
  let body = raw

  const headerMatch = raw.match(/^((?:[^\n]+\n)+)\n([\s\S]*)/)
  if (headerMatch) {
    const headerBlock = headerMatch[1]
    body = headerMatch[2]

    for (const line of headerBlock.split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim().toLowerCase()
      const value = line.slice(colonIdx + 1).trim()

      if (key === 'title') title = value
      if (key === 'published time') publishedAt = value
    }
  }

  // Fall back: use the first H1 as title
  if (!title) {
    const h1 = body.match(/^#\s+(.+)/m)
    if (h1) title = h1[1].trim()
  }

  const markdown = body.trim()
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  return {
    url: originalUrl,
    title: title || 'Untitled',
    publishedAt,
    htmlContent: '',
    markdownContent: markdown,
    excerpt: markdown.slice(0, 200),
    wordCount,
  }
}

export async function fetchWithJina(url: string): Promise<ScrapedArticle> {
  const jinaUrl = `${JINA_BASE}/${url}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/markdown,text/plain,*/*',
        'X-Return-Format': 'markdown',
        'X-No-Cache': 'true',
      },
    })

    if (!res.ok) {
      throw new Error(`JINA_FAILED: HTTP ${res.status}`)
    }

    const raw = await res.text()

    if (!raw || raw.trim().length < 100) {
      throw new Error('JINA_FAILED: Empty or too-short response')
    }

    return parseJinaMarkdown(raw, url)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('JINA_TIMEOUT: Jina Reader timed out')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
