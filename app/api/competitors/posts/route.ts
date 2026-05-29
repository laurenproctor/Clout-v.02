import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { CompetitorPost, CompetitorMetadata } from '@/types/feed'

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim()
}

function extractXmlText(xml: string, tag: string): string | null {
  // CDATA or plain text
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'))
  if (cdataMatch) return cdataMatch[1].trim()
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return plainMatch ? plainMatch[1].trim() : null
}

function extractAtomLinkHref(itemXml: string): string | null {
  const m = itemXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/)
  return m ? m[1] : null
}

function parseRssFeed(xml: string, domain: string, brandName: string): CompetitorPost[] {
  const posts: CompetitorPost[] = []

  // RSS 2.0 items
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const item = m[1]
    const title = extractXmlText(item, 'title')
    const link = extractXmlText(item, 'link') ?? extractAtomLinkHref(item)
    const pubDate = extractXmlText(item, 'pubDate')
    const description = extractXmlText(item, 'description') ?? extractXmlText(item, 'summary')

    if (!title || !link) continue

    posts.push({
      id: link,
      brand_domain: domain,
      brand_name: brandName,
      property: 'blog',
      property_label: `${brandName} · Blog`,
      title: stripHtml(title).slice(0, 200),
      excerpt: stripHtml(description ?? '').slice(0, 280),
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      url: link,
    })
  }

  // Atom entries
  if (posts.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    while ((m = entryRegex.exec(xml)) !== null) {
      const entry = m[1]
      const title = extractXmlText(entry, 'title')
      const link = extractAtomLinkHref(entry) ?? extractXmlText(entry, 'id')
      const published = extractXmlText(entry, 'published') ?? extractXmlText(entry, 'updated')
      const summary = extractXmlText(entry, 'summary') ?? extractXmlText(entry, 'content')

      if (!title || !link) continue

      posts.push({
        id: link,
        brand_domain: domain,
        brand_name: brandName,
        property: 'blog',
        property_label: `${brandName} · Blog`,
        title: stripHtml(title).slice(0, 200),
        excerpt: stripHtml(summary ?? '').slice(0, 280),
        published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
        url: link,
      })
    }
  }

  return posts.slice(0, 8)
}

async function tryDiscoverRss(domain: string, html: string): Promise<string | null> {
  const rssLink = html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss|atom)\+xml["']/i)
  if (rssLink) {
    const href = rssLink[1]
    return href.startsWith('http') ? href : `https://${domain}${href.startsWith('/') ? '' : '/'}${href}`
  }

  for (const path of ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/blog/feed', '/blog/rss']) {
    try {
      const res = await fetch(`https://${domain}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
        signal: AbortSignal.timeout(2500),
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

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('workspace_feed_settings')
    .select('competitors, competitor_metadata')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()

  if (!settings?.competitors?.length) return NextResponse.json({ posts: [] })

  const metadata = (settings.competitor_metadata ?? {}) as CompetitorMetadata
  const allPosts: CompetitorPost[] = []

  await Promise.allSettled(
    settings.competitors.map(async (domain: string) => {
      const meta = metadata[domain] ?? {}
      const brandName = meta.name ?? domain

      let rssUrl = meta.rss_url ?? null

      // Discover RSS if not stored
      if (!rssUrl) {
        try {
          const homeRes = await fetch(`https://${domain}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
            signal: AbortSignal.timeout(4000),
            redirect: 'follow',
          })
          if (homeRes.ok) {
            const buf = await homeRes.arrayBuffer()
            const html = new TextDecoder().decode(buf.slice(0, 100_000))
            rssUrl = await tryDiscoverRss(domain, html)
          }
        } catch { /* skip */ }
      }

      if (!rssUrl) return

      try {
        const rssRes = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 1800 },
        })
        if (!rssRes.ok) return

        const xml = await rssRes.text()
        const posts = parseRssFeed(xml, domain, brandName)
        allPosts.push(...posts)
      } catch { /* skip */ }
    })
  )

  allPosts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

  return NextResponse.json({ posts: allPosts })
}
