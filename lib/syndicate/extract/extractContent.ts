import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import type { ExtractedContent, ContentChunk } from '../types/analysis'

const CHUNK_TARGET_CHARS = 800
const WORDS_PER_MINUTE = 200

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function chunkText(text: string, sections: { heading?: string; text: string }[]): ContentChunk[] {
  const chunks: ContentChunk[] = []
  let order = 0

  for (const section of sections) {
    const words = section.text.split(/\s+/).filter(Boolean)
    let current = ''

    for (const word of words) {
      current += (current ? ' ' : '') + word
      if (current.length >= CHUNK_TARGET_CHARS) {
        chunks.push({
          id: `chunk-${order}`,
          text: current,
          tokenCount: estimateTokens(current),
          section: section.heading,
          order: order++,
        })
        current = ''
      }
    }

    if (current.trim()) {
      chunks.push({
        id: `chunk-${order}`,
        text: current,
        tokenCount: estimateTokens(current),
        section: section.heading,
        order: order++,
      })
    }
  }

  return chunks
}

function parseSections(element: Element): { heading?: string; text: string }[] {
  const sections: { heading?: string; text: string }[] = []
  let currentHeading: string | undefined
  let currentText = ''

  const flush = () => {
    const trimmed = currentText.trim()
    if (trimmed) {
      sections.push({ heading: currentHeading, text: trimmed })
    }
    currentText = ''
  }

  for (const child of Array.from(element.children)) {
    const tag = child.tagName.toLowerCase()
    if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
      flush()
      currentHeading = child.textContent?.trim()
    } else {
      currentText += ' ' + (child.textContent ?? '')
    }
  }

  flush()
  return sections.length > 0 ? sections : [{ text: element.textContent?.trim() ?? '' }]
}

export async function extractContent(url: string): Promise<ExtractedContent> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Clout/1.0; +https://clout.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    throw new Error(`FETCH_FAILED: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article || !article.textContent?.trim()) {
    throw new Error('EXTRACTION_FAILED: Readability could not parse readable content')
  }

  const rawWordCount = (article.textContent.match(/\S+/g) ?? []).length
  if (rawWordCount < 150) {
    throw new Error('LOW_SIGNAL: Content too short for syndication')
  }

  // Parse sections from the article DOM for structure-aware chunking
  const articleDom = new JSDOM(`<div>${article.content}</div>`)
  const root = articleDom.window.document.querySelector('div')!
  const sections = parseSections(root)

  const content = article.textContent.replace(/\s+/g, ' ').trim()
  const wordCount = content.split(/\s+/).length
  const chunks = chunkText(content, sections)

  return {
    url,
    title: article.title ?? '',
    author: article.byline ?? undefined,
    siteName: article.siteName ?? undefined,
    publishedAt: article.publishedTime ?? undefined,
    content,
    excerpt: article.excerpt ?? content.slice(0, 200),
    sections,
    chunks,
    estimatedReadTime: Math.ceil(wordCount / WORDS_PER_MINUTE),
  }
}
