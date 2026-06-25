import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'
import { discoverCompetitorChannels, type DiscoveryResult } from '@/lib/competitors/discover-socials'
import { discoverChannelsViaWebSearch } from '@/lib/competitors/web-search-channels'

// Web search (Layer 2) can take ~30s worst-case (multiple searches + per-platform
// validation fetches); give headroom while staying well under Vercel's 300s cap.
export const maxDuration = 60

// Kill switch: Layer-2 LLM web search is opt-in. Off → Layer-1 homepage scrape only.
const WEB_SEARCH_ENABLED = process.env.COMPETITOR_DISCOVERY_WEB_SEARCH_ENABLED === 'true'

// Per-domain result cache (24h) to avoid repeat web-search charges. Bypassed with ?refresh=1.
const cache = new LRUCache<string, DiscoveryResult>({ max: 500, ttl: 24 * 60 * 60 * 1000 })

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get('url')
  if (!rawUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const refresh = searchParams.get('refresh') === '1'
  const domain = rawUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().replace(/^www\./, '')

  if (!refresh) {
    const cached = cache.get(domain)
    if (cached) return NextResponse.json(toResponse(cached))
  }

  const started = Date.now()
  const result = await discoverCompetitorChannels(domain, {
    webSearch: WEB_SEARCH_ENABLED ? discoverChannelsViaWebSearch : null,
  })

  // Observability — one structured line; web search is billed per search.
  console.info('[competitor-discovery]', JSON.stringify({
    domain,
    layer1_found_count: result.meta.layer1_found_count,
    missing_platforms: result.meta.missing_platforms,
    web_search_used: result.meta.web_search_used,
    verified_count: result.meta.verified_count,
    likely_count: result.meta.likely_count,
    duration_ms: Date.now() - started,
    fallback_reason: result.meta.fallback_reason,
  }))

  cache.set(domain, result)
  return NextResponse.json(toResponse(result))
}

// Public response shape — preserves the legacy { name, domain, socials, rss_url }
// fields and adds candidate_channels + confidence + the new channel URLs.
function toResponse(r: DiscoveryResult) {
  return {
    name: r.name,
    domain: r.domain,
    socials: r.socials,
    rss_url: r.rss_url ?? null,
    newsletter_url: r.newsletter_url ?? null,
    substack_url: r.substack_url ?? null,
    candidate_channels: r.candidate_channels,
    confidence: r.confidence,
  }
}
