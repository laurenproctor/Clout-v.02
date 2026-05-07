import type { ExtractedContent } from '@/lib/syndicate/types/analysis'

const NOISE_TAGS = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe', 'form', 'button', 'svg']

function stripTag(html: string, tag: string): string {
  return html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
}

function extractBlock(html: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]+)<\\/${tag}>`, 'gi').exec(html)
  return match ? match[1] : null
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extractTitle(html: string): string {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (og) return decodeEntities(og[1])
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)
  if (title) return decodeEntities(title[1].split('|')[0].split('–')[0].trim())
  return ''
}

function cleanText(raw: string): string {
  return decodeEntities(stripTags(raw))
    .replace(/\s{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export async function extractUrl(url: string): Promise<ExtractedContent> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Clout/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    throw new Error(`FETCH_FAILED: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  const title = extractTitle(html)

  // Strip noise blocks first
  let body = html
  for (const tag of NOISE_TAGS) {
    body = stripTag(body, tag)
  }

  // Prefer semantic content containers
  const content =
    extractBlock(body, 'article') ??
    extractBlock(body, 'main') ??
    extractBlock(body, 'div') ??
    body

  const text = cleanText(content).slice(0, 12_000)
  const wordCount = text.split(/\s+/).filter(Boolean).length

  if (wordCount < 50) {
    throw new Error('LOW_SIGNAL: Content too short for syndication')
  }

  return {
    url,
    title,
    content: text,
    excerpt: text.slice(0, 200),
    sections: [{ text }],
    chunks: [{ id: 'chunk-0', text, tokenCount: Math.ceil(text.length / 4), order: 0 }],
    estimatedReadTime: Math.ceil(wordCount / 200),
  }
}
