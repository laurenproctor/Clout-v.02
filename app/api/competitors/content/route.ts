import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

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

  // 3. Merge, optional filter, sort by importance then recency
  let combined = [...scrapedItems, ...newsItems]
  if (source_type) combined = combined.filter(i => i.source_type === source_type)

  combined.sort((a, b) => {
    if (b.importance_score !== a.importance_score) return b.importance_score - a.importance_score
    return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  })

  return NextResponse.json({ items: combined.slice(0, 60) })
}
