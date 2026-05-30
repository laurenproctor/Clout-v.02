import type { RawPost, ScraperOpts } from './types'

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function xmlText(xml: string, tag: string): string | null {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'))
  if (cdata) return cdata[1].trim()
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return plain ? plain[1].trim() : null
}

function atomLink(itemXml: string): string | null {
  const m = itemXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/)
  return m ? m[1] : null
}

function parseRss(xml: string): RawPost[] {
  const posts: RawPost[] = []

  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const item    = m[1]
    const title   = xmlText(item, 'title')
    const link    = xmlText(item, 'link') ?? atomLink(item)
    const pubDate = xmlText(item, 'pubDate')
    const desc    = xmlText(item, 'description') ?? xmlText(item, 'summary')
    if (!title || !link) continue
    posts.push({
      external_id:  link,
      title:        stripHtml(title).slice(0, 200),
      content:      stripHtml(desc ?? '').slice(0, 500),
      url:          link,
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      metrics:      {},
    })
  }

  if (posts.length === 0) {
    const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    while ((m = entryRe.exec(xml)) !== null) {
      const entry     = m[1]
      const title     = xmlText(entry, 'title')
      const link      = atomLink(entry) ?? xmlText(entry, 'id')
      const published = xmlText(entry, 'published') ?? xmlText(entry, 'updated')
      const summary   = xmlText(entry, 'summary') ?? xmlText(entry, 'content')
      if (!title || !link) continue
      posts.push({
        external_id:  link,
        title:        stripHtml(title).slice(0, 200),
        content:      stripHtml(summary ?? '').slice(0, 500),
        url:          link,
        published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
        metrics:      {},
      })
    }
  }

  return posts
}

async function discoverRss(domain: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const buf  = await res.arrayBuffer()
    const html = new TextDecoder().decode(buf.slice(0, 100_000))

    const rssLink = html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss|atom)\+xml["']/i)
    if (rssLink) {
      const href = rssLink[1]
      return href.startsWith('http') ? href : `https://${domain}${href.startsWith('/') ? '' : '/'}${href}`
    }
  } catch { /* skip */ }

  for (const path of ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/blog/feed', '/blog/rss']) {
    try {
      const res = await fetch(`https://${domain}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
        signal: AbortSignal.timeout(3000),
        redirect: 'follow',
      })
      const ct = res.headers.get('content-type') ?? ''
      if (res.ok && (ct.includes('xml') || ct.includes('rss') || ct.includes('atom'))) {
        return `https://${domain}${path}`
      }
    } catch { /* try next */ }
  }
  return null
}

export async function scrapeBlog(
  domain: string,
  knownRssUrl: string | null | undefined,
  opts: ScraperOpts = {}
): Promise<RawPost[]> {
  const rssUrl = knownRssUrl ?? await discoverRss(domain)
  if (!rssUrl) return []

  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRss(xml).slice(0, opts.maxPosts ?? 10)
  } catch {
    return []
  }
}
