import { createServiceClient } from '@/lib/supabase/service'
import { scrapeBlog }      from './scrapers/blog'
import { scrapeYouTube }   from './scrapers/youtube'
import { scrapeTwitter }   from './scrapers/twitter'
import { scrapeFacebook }  from './scrapers/facebook'
import { scrapeLinkedIn }  from './scrapers/linkedin'
import { scrapeInstagram } from './scrapers/instagram'
import { enrichContent }   from './enrich-content'
import { calculateImportanceScore } from './calculate-importance'
import type { RawPost } from './scrapers/types'
import type { CompetitorMetadata } from '@/types/feed'

type SourceType = 'blog' | 'youtube' | 'twitter' | 'linkedin' | 'instagram' | 'facebook'

const SCRAPERS: Record<SourceType, (url: string) => Promise<RawPost[]>> = {
  blog:      () => Promise.resolve([]),
  youtube:   url => scrapeYouTube(url),
  twitter:   url => scrapeTwitter(url),
  facebook:  url => scrapeFacebook(url),
  linkedin:  url => scrapeLinkedIn(url),
  instagram: url => scrapeInstagram(url),
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function sourceConfidence(sourceType: SourceType): 'high' | 'medium' | 'low' {
  return ({ blog: 'high', youtube: 'high', linkedin: 'medium', twitter: 'medium', instagram: 'low', facebook: 'low' } as const)[sourceType] ?? 'medium'
}

export interface IngestResult {
  scraped:  number
  enriched: number
  inserted: number
  skipped:  number
  errors:   string[]
}

export async function ingestCompetitorContent(): Promise<IngestResult> {
  const supabase = createServiceClient()
  const result: IngestResult = { scraped: 0, enriched: 0, inserted: 0, skipped: 0, errors: [] }

  const { data: rows, error } = await supabase
    .from('workspace_feed_settings')
    .select('workspace_id, competitors, competitor_metadata')
    .not('competitor_metadata', 'is', null)

  if (error) { result.errors.push(`Workspace fetch failed: ${error.message}`); return result }

  // Build global map: domain → { workspaceIds[], rss_url?, socials{} }
  const domainMap = new Map<string, {
    workspaceIds: string[]
    rssUrl:       string | null
    socials:      Partial<Record<SourceType, string>>
  }>()

  for (const row of rows ?? []) {
    const meta = (row.competitor_metadata ?? {}) as CompetitorMetadata
    for (const domain of (row.competitors ?? []) as string[]) {
      const entry = domainMap.get(domain) ?? { workspaceIds: [], rssUrl: null, socials: {} }
      if (!entry.workspaceIds.includes(row.workspace_id)) entry.workspaceIds.push(row.workspace_id)
      if (!entry.rssUrl && meta[domain]?.rss_url) entry.rssUrl = meta[domain].rss_url ?? null
      const socials = (meta[domain]?.socials ?? {}) as Partial<Record<SourceType, string>>
      for (const [platform, url] of Object.entries(socials) as [SourceType, string][]) {
        if (url && !entry.socials[platform]) entry.socials[platform] = url
      }
      domainMap.set(domain, entry)
    }
  }

  const domains = [...domainMap.entries()].slice(0, 20)

  for (const [domain, { workspaceIds, rssUrl, socials }] of domains) {
    const blogPosts = await scrapeBlog(domain, rssUrl).catch(() => [])
    const allPosts: Array<{ sourceType: SourceType; post: RawPost }> = blogPosts.map(p => ({ sourceType: 'blog' as SourceType, post: p }))

    for (const [sourceType, url] of Object.entries(socials) as [SourceType, string][]) {
      if (!url || sourceType === 'blog') continue
      await delay(1500)
      try {
        const posts = await SCRAPERS[sourceType](url)
        for (const post of posts) allPosts.push({ sourceType, post })
      } catch (err) {
        result.errors.push(`Scrape failed [${sourceType}/${domain}]: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    result.scraped += allPosts.length

    for (const { sourceType, post } of allPosts) {
      const enrichment = await enrichContent(post.title, post.content, sourceType)
      result.enriched++

      const importance_score = calculateImportanceScore({
        published_at:      post.published_at,
        metrics:           post.metrics,
        content:           post.content,
        source_type:       sourceType,
        source_confidence: sourceConfidence(sourceType),
        topics:            enrichment.topics,
      })

      const { data: globalRow, error: upsertErr } = await supabase
        .from('competitor_content_global')
        .upsert({
          competitor_domain: domain,
          source_type:       sourceType,
          external_id:       post.external_id,
          title:             post.title ?? null,
          content:           post.content,
          summary:           enrichment.summary || null,
          url:               post.url,
          thumbnail_url:     post.thumbnail_url ?? null,
          published_at:      post.published_at,
          fetched_at:        new Date().toISOString(),
          metrics:           post.metrics,
          topics:            enrichment.topics,
          importance_score,
          source_confidence: sourceConfidence(sourceType),
        }, { onConflict: 'competitor_domain,source_type,external_id' })
        .select('id')
        .single()

      if (upsertErr || !globalRow) {
        result.errors.push(`Global upsert failed [${sourceType}/${domain}/${post.external_id}]: ${upsertErr?.message}`)
        continue
      }

      result.inserted++

      const mappings = workspaceIds.map(workspace_id => ({ workspace_id, content_id: globalRow.id }))
      await supabase
        .from('workspace_competitor_content')
        .upsert(mappings, { onConflict: 'workspace_id,content_id', ignoreDuplicates: true })
    }
  }

  return result
}
