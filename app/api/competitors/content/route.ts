import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { CompetitorMetadata } from '@/types/feed'

export interface CompetitorContentItem {
  id:                string
  competitor_domain: string
  source_type:       string
  title:             string | null
  content:           string
  summary:           string | null
  url:               string
  thumbnail_url:     string | null
  published_at:      string | null
  metrics:           { likes?: number; comments?: number; shares?: number; views?: number }
  topics:            string[]
  importance_score:  number
  source_confidence: string
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim()
}

function extractXmlText(xml: string, tag: string): string | null {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'))
  if (cdataMatch) return cdataMatch[1].trim()
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return plainMatch ? plainMatch[1].trim() : null
}

function extractAtomLinkHref(xml: string): string | null {
  const m = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/)
  return m ? m[1] : null
}

function parseRss(xml: string, domain: string, brandName: string): CompetitorContentItem[] {
  const posts: CompetitorContentItem[] = []

  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const item = m[1]
    const title = extractXmlText(item, 'title')
    const link  = extractXmlText(item, 'link') ?? extractAtomLinkHref(item)
    const pubDate = extractXmlText(item, 'pubDate')
    const desc  = extractXmlText(item, 'description') ?? extractXmlText(item, 'summary')
    if (!title || !link) continue
    posts.push({
      id:                link,
      competitor_domain: domain,
      source_type:       'blog',
      title:             stripHtml(title).slice(0, 200),
      content:           stripHtml(desc ?? '').slice(0, 280),
      summary:           null,
      url:               link,
      thumbnail_url:     null,
      published_at:      pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      metrics:           {},
      topics:            [brandName],
      importance_score:  50,
      source_confidence: 'high',
    })
  }

  if (posts.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    while ((m = entryRegex.exec(xml)) !== null) {
      const entry = m[1]
      const title   = extractXmlText(entry, 'title')
      const link    = extractAtomLinkHref(entry) ?? extractXmlText(entry, 'id')
      const published = extractXmlText(entry, 'published') ?? extractXmlText(entry, 'updated')
      const summary = extractXmlText(entry, 'summary') ?? extractXmlText(entry, 'content')
      if (!title || !link) continue
      posts.push({
        id:                link,
        competitor_domain: domain,
        source_type:       'blog',
        title:             stripHtml(title).slice(0, 200),
        content:           stripHtml(summary ?? '').slice(0, 280),
        summary:           null,
        url:               link,
        thumbnail_url:     null,
        published_at:      published ? new Date(published).toISOString() : new Date().toISOString(),
        metrics:           {},
        topics:            [brandName],
        importance_score:  50,
        source_confidence: 'high',
      })
    }
  }

  return posts.slice(0, 8)
}

async function discoverRssUrl(domain: string, html: string): Promise<string | null> {
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

async function fetchRssItems(domains: string[], metadata: CompetitorMetadata): Promise<CompetitorContentItem[]> {
  const allItems: CompetitorContentItem[] = []
  await Promise.allSettled(
    domains.map(async (domain) => {
      const meta = metadata[domain] ?? {}
      const brandName = meta.name ?? domain
      let rssUrl = meta.rss_url ?? null

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
            rssUrl = await discoverRssUrl(domain, html)
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
        allItems.push(...parseRss(xml, domain, brandName))
      } catch { /* skip */ }
    })
  )
  return allItems
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const source_type = req.nextUrl.searchParams.get('source_type')

  const supabase = await createClient()

  // 1. Scraped content from global cache via workspace mapping
  const { data: mappingRows } = await supabase
    .from('workspace_competitor_content')
    .select(`
      content_id,
      competitor_content_global (
        id, competitor_domain, source_type, title, content, summary,
        url, thumbnail_url, published_at, metrics, topics, importance_score, source_confidence
      )
    `)
    .eq('workspace_id', session.workspaceId)

  const scrapedItems: CompetitorContentItem[] = (mappingRows ?? [])
    .map(r => {
      const g = Array.isArray(r.competitor_content_global)
        ? r.competitor_content_global[0]
        : r.competitor_content_global
      if (!g) return null
      return {
        id:                g.id,
        competitor_domain: g.competitor_domain,
        source_type:       g.source_type,
        title:             g.title,
        content:           g.content ?? '',
        summary:           g.summary,
        url:               g.url,
        thumbnail_url:     g.thumbnail_url,
        published_at:      g.published_at,
        metrics:           (g.metrics as CompetitorContentItem['metrics']) ?? {},
        topics:            (g.topics as string[]) ?? [],
        importance_score:  g.importance_score ?? 0,
        source_confidence: g.source_confidence ?? 'high',
      } satisfies CompetitorContentItem
    })
    .filter((x): x is CompetitorContentItem => x !== null)

  // 2. News signal cards for this workspace's competitors
  const { data: competitorEntities } = await supabase
    .from('competitor_entities')
    .select('id, domain')
    .eq('workspace_id', session.workspaceId)

  const competitorEntityIds = (competitorEntities ?? []).map(e => e.id)
  const entityDomainMap = Object.fromEntries((competitorEntities ?? []).map(e => [e.id, e.domain ?? '']))

  let newsItems: CompetitorContentItem[] = []
  if (competitorEntityIds.length > 0) {
    const { data: signalCards } = await supabase
      .from('signal_cards')
      .select('id, title, competitor_id, gdelt_score, created_at, momentum_bar_width')
      .eq('tab', 'competitors')
      .in('competitor_id', competitorEntityIds)
      .order('gdelt_score', { ascending: false })
      .limit(20)

    newsItems = (signalCards ?? []).map(card => {
      const domain = entityDomainMap[card.competitor_id ?? ''] ?? ''
      const gdeltScore = card.gdelt_score ?? 0
      const velocity   = card.momentum_bar_width ?? 0
      return {
        id:                card.id,
        competitor_domain: domain,
        source_type:       'news',
        title:             card.title,
        content:           card.title ?? '',
        summary:           null,
        url:               '',
        thumbnail_url:     null,
        published_at:      card.created_at,
        metrics:           {},
        topics:            [],
        importance_score:  Math.min(100, Math.round(gdeltScore * 10 + velocity * 0.2)),
        source_confidence: 'high',
      } satisfies CompetitorContentItem
    })
  }

  // 3. RSS fallback: read live blog posts from workspace_feed_settings when DB sources are empty
  let rssItems: CompetitorContentItem[] = []
  if (scrapedItems.length === 0 && newsItems.length === 0) {
    const { data: feedSettings } = await supabase
      .from('workspace_feed_settings')
      .select('competitors, competitor_metadata')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle()

    const domains: string[] = feedSettings?.competitors ?? []
    const metadata = (feedSettings?.competitor_metadata ?? {}) as CompetitorMetadata
    if (domains.length > 0) {
      rssItems = await fetchRssItems(domains, metadata)
    }
  }

  // 4. Merge, optional filter, sort by importance then recency
  let combined = [...scrapedItems, ...newsItems, ...rssItems]
  if (source_type) combined = combined.filter(i => i.source_type === source_type)

  combined.sort((a, b) => {
    if (b.importance_score !== a.importance_score) return b.importance_score - a.importance_score
    return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  })

  return NextResponse.json({ items: combined.slice(0, 60) })
}
