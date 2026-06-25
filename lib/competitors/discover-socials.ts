// ============================================================
// Competitor channel discovery — layered, identity-validated
// ============================================================
// Layer 1: homepage scrape (high precision, all `verified`)
// Layer 2: LLM web-search agent fills gaps (gated by the route's kill switch)
// Layer 3: identity validation — only `verified` channels enter `socials`;
//          lower-confidence guesses are kept in `candidate_channels` for review.
//
// I/O is injected via DiscoverDeps so the engine is unit-testable without network.

import { isSafeUrl } from '@/lib/scraper/isSafeUrl'
import { fetchHtml } from '@/lib/scraper/fetchUrl'
import { discoverFeedUrl } from '@/lib/scraper/blogDiscovery'
import type {
  CompetitorSocials,
  SocialPlatform,
  DiscoverableChannel,
  ChannelEvidence,
} from '@/types/feed'

const UA = 'Mozilla/5.0 (compatible; CloutBot/1.0; +https://clout.so)'

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'twitter', 'linkedin', 'instagram', 'youtube', 'facebook', 'tiktok', 'threads', 'pinterest',
]

// Slugs that are platform routes, not profiles.
const RESERVED: Partial<Record<SocialPlatform, Set<string>>> = {
  twitter: new Set(['intent', 'home', 'login', 'signup', 'explore', 'i', 'share', 'hashtag', 'search', 'about', 'tos', 'privacy', 'messages']),
  linkedin: new Set(['login', 'signup', 'feed', 'jobs', 'learning', 'pulse', 'in', 'authwall', 'sharing']),
  instagram: new Set(['p', 'explore', 'reel', 'reels', 'stories', 'tv', 'accounts', 'about', 'directory']),
  facebook: new Set(['sharer', 'dialog', 'login', 'signup', 'photo', 'video', 'share', 'events', 'groups', 'watch']),
  tiktok: new Set(['login', 'foryou', 'discover', 'tag', 'search', 'about', 'upload']),
  threads: new Set(['login', 'search', 'about']),
  pinterest: new Set(['pin', 'login', 'signup', 'search', 'ideas', 'today', 'categories']),
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '').replace(/^mobile\./, '')
}

// ---------------------------------------------------------------------------
// normalizeChannelUrl — canonical, dedup-safe form per platform (or null)
// ---------------------------------------------------------------------------
export function normalizeChannelUrl(platform: DiscoverableChannel, raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

  const host = bareHost(u.hostname)
  const segs = u.pathname.split('/').filter(Boolean)

  const blocked = (p: SocialPlatform, slug: string) => RESERVED[p]?.has(slug.toLowerCase())

  switch (platform) {
    case 'twitter': {
      if (host !== 'twitter.com' && host !== 'x.com') return null
      const handle = segs[0]
      if (!handle || blocked('twitter', handle)) return null
      return `https://twitter.com/${handle.toLowerCase()}`
    }
    case 'threads': {
      if (host !== 'threads.net' && host !== 'threads.com') return null
      const seg = segs[0]
      if (!seg || !seg.startsWith('@')) return null
      const handle = seg.slice(1)
      if (!handle || blocked('threads', handle)) return null
      return `https://threads.net/@${handle.toLowerCase()}`
    }
    case 'linkedin': {
      if (host !== 'linkedin.com') return null
      const kind = segs[0]
      if (kind !== 'company' && kind !== 'school') return null
      const slug = segs[1]
      if (!slug) return null
      return `https://linkedin.com/${kind}/${slug.toLowerCase()}`
    }
    case 'instagram': {
      if (host !== 'instagram.com') return null
      const handle = segs[0]
      if (!handle || blocked('instagram', handle)) return null
      return `https://instagram.com/${handle.toLowerCase()}`
    }
    case 'youtube': {
      if (host !== 'youtube.com') return null
      const first = segs[0]
      if (!first) return null
      // Preserve case — channel ids are case-sensitive.
      if (first.startsWith('@')) return `https://youtube.com/${first}`
      if ((first === 'channel' || first === 'c' || first === 'user') && segs[1]) {
        return `https://youtube.com/${first}/${segs[1]}`
      }
      return null
    }
    case 'facebook': {
      if (host !== 'facebook.com') return null
      const slug = segs[0]
      if (!slug || blocked('facebook', slug)) return null
      if (slug === 'profile.php') {
        const id = u.searchParams.get('id')
        return id ? `https://facebook.com/profile.php?id=${id}` : null
      }
      return `https://facebook.com/${slug.toLowerCase()}`
    }
    case 'tiktok': {
      if (host !== 'tiktok.com') return null
      const seg = segs[0]
      if (!seg || !seg.startsWith('@')) return null
      const handle = seg.slice(1)
      if (!handle || blocked('tiktok', handle)) return null
      return `https://tiktok.com/@${handle.toLowerCase()}`
    }
    case 'pinterest': {
      if (host !== 'pinterest.com') return null
      const user = segs[0]
      if (!user || blocked('pinterest', user)) return null
      return `https://pinterest.com/${user.toLowerCase()}`
    }
    case 'substack': {
      if (host.endsWith('.substack.com')) {
        const sub = host.replace('.substack.com', '')
        return sub ? `https://${sub}.substack.com` : null
      }
      // Custom Substack domain — keep host, drop path/query.
      return `https://${host}`
    }
    case 'newsletter':
    case 'rss': {
      if (!isSafeUrl(`https://${host}${u.pathname}`)) return null
      return `https://${host}${u.pathname.replace(/\/$/, '')}${u.search}`
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Layer 1 helpers — homepage HTML
// ---------------------------------------------------------------------------
export function extractSiteName(html: string, domain: string): string {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)
  if (og) return og[1].trim()

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (title) {
    const parts = title[1].split(/\s*[\|\-–—]\s*/)
    return (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim().slice(0, 60)
  }
  return domain.replace(/^www\./, '').split('.')[0]
}

export function extractSocialCandidates(html: string): Partial<Record<SocialPlatform, string>> {
  const found: Partial<Record<SocialPlatform, string>> = {}
  const seen = new Set<string>()
  const hrefRegex = /href=["']([^"'\s]+)["']/gi
  let match: RegExpExecArray | null

  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1]
    if (seen.has(raw)) continue
    seen.add(raw)
    for (const platform of SOCIAL_PLATFORMS) {
      if (found[platform]) continue
      const norm = normalizeChannelUrl(platform, raw)
      if (norm) found[platform] = norm
    }
  }
  return found
}

function extractSubstackLink(html: string): string | null {
  const hrefRegex = /href=["']([^"'\s]+)["']/gi
  let match: RegExpExecArray | null
  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const host = bareHost(new URL(match[1]).hostname)
      if (host.endsWith('.substack.com')) return normalizeChannelUrl('substack', match[1])
    } catch {
      // not a URL
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Identity validation
// ---------------------------------------------------------------------------
function htmlLinksToDomain(html: string, domain: string): boolean {
  if (!domain) return false
  return html.toLowerCase().includes(domain.toLowerCase())
}

function htmlMentionsName(html: string, name: string): boolean {
  const n = name.trim().toLowerCase()
  if (n.length < 3) return false
  const head = html.slice(0, 20_000).toLowerCase()
  return head.includes(n)
}

async function validateCandidate(
  platform: DiscoverableChannel,
  url: string,
  ctx: { domain: string; companyName: string; now: string; fetchProfile?: DiscoverDeps['fetchProfile'] }
): Promise<ChannelEvidence> {
  const base: Omit<ChannelEvidence, 'status' | 'source'> = { url, checked_at: ctx.now }

  let res: ProfileFetch | null = null
  try {
    res = ctx.fetchProfile ? await ctx.fetchProfile(url) : null
  } catch {
    res = null
  }

  if (!res) {
    return { ...base, status: 'likely', source: 'llm_web_search', reason: 'could not fetch profile to confirm' }
  }
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      return { ...base, status: 'likely', source: 'llm_web_search', reason: `bot-blocked (${res.status})` }
    }
    return { ...base, status: 'rejected', source: 'llm_web_search', reason: `unreachable (${res.status})` }
  }
  // Redirect trap — final URL must still be a profile on the same platform.
  if (res.finalUrl && !normalizeChannelUrl(platform, res.finalUrl)) {
    return { ...base, status: 'rejected', source: 'llm_web_search', reason: 'redirected away from profile' }
  }
  // Reciprocity is the strongest cheap signal.
  if (res.html && htmlLinksToDomain(res.html, ctx.domain)) {
    return { ...base, status: 'verified', source: 'reciprocal_link', evidence_url: url, reason: 'profile links back to domain' }
  }
  if (res.html && htmlMentionsName(res.html, ctx.companyName)) {
    return { ...base, status: 'verified', source: 'metadata_match', evidence_url: url, reason: 'profile metadata matches company name' }
  }
  return { ...base, status: 'likely', source: 'llm_web_search', reason: 'exists but identity unconfirmed' }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export interface ProfileFetch {
  ok: boolean
  status: number
  finalUrl: string
  html: string
}

export interface WebSearchChannels {
  name?: string
  socials?: Partial<Record<SocialPlatform, string>>
  newsletter_url?: string
  substack_url?: string
  rss_url?: string
}

export interface DiscoverDeps {
  fetchHtml: (url: string) => Promise<string | null>
  // null/undefined = kill switch off → Layer 2 skipped.
  webSearch: ((args: { domain: string; companyName: string; missing: SocialPlatform[] }) => Promise<WebSearchChannels | null>) | null
  fetchProfile?: (url: string) => Promise<ProfileFetch | null>
  now: () => string
}

export interface DiscoveryResult {
  name: string
  domain: string
  socials: CompetitorSocials
  candidate_channels: Partial<Record<DiscoverableChannel, ChannelEvidence>>
  rss_url?: string
  newsletter_url?: string
  substack_url?: string
  confidence: Partial<Record<DiscoverableChannel, ChannelEvidence>>
  /** lightweight telemetry for the route to log */
  meta: {
    layer1_found_count: number
    missing_platforms: SocialPlatform[]
    web_search_used: boolean
    verified_count: number
    likely_count: number
    fallback_reason?: string
  }
}

async function defaultFetchHtml(url: string): Promise<string | null> {
  try {
    return await fetchHtml(url)
  } catch {
    return null
  }
}

async function defaultFetchProfile(url: string): Promise<ProfileFetch | null> {
  if (!isSafeUrl(url)) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    })
    const buf = await res.arrayBuffer()
    const html = new TextDecoder().decode(buf.slice(0, 200_000))
    return { ok: res.ok, status: res.status, finalUrl: res.url, html }
  } catch {
    return null
  }
}

function withDefaults(deps?: Partial<DiscoverDeps>): DiscoverDeps {
  return {
    fetchHtml: deps?.fetchHtml ?? defaultFetchHtml,
    webSearch: deps?.webSearch ?? null,
    fetchProfile: deps?.fetchProfile ?? defaultFetchProfile,
    now: deps?.now ?? (() => new Date().toISOString()),
  }
}

export async function discoverCompetitorChannels(
  domain: string,
  deps?: Partial<DiscoverDeps>
): Promise<DiscoveryResult> {
  const d = withDefaults(deps)
  const now = d.now()
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().replace(/^www\./, '')

  const socials: CompetitorSocials = {}
  const candidate_channels: DiscoveryResult['candidate_channels'] = {}
  const confidence: DiscoveryResult['confidence'] = {}
  const empty = (reason?: string): DiscoveryResult => ({
    name: clean, domain: clean, socials, candidate_channels, confidence,
    meta: { layer1_found_count: 0, missing_platforms: [...SOCIAL_PLATFORMS], web_search_used: false, verified_count: 0, likely_count: 0, fallback_reason: reason },
  })

  const homeUrl = `https://${clean}`
  if (!clean || !isSafeUrl(homeUrl)) return empty('unsafe domain')

  // --- Layer 1: homepage scrape -------------------------------------------
  const html = (await d.fetchHtml(homeUrl).catch(() => null)) ?? ''
  const name = extractSiteName(html, clean)
  const scraped = extractSocialCandidates(html)
  for (const [platform, url] of Object.entries(scraped) as [SocialPlatform, string][]) {
    socials[platform] = url
    confidence[platform] = { url, status: 'verified', source: 'homepage', checked_at: now }
  }

  let rss_url = (html ? discoverFeedUrl(html, homeUrl) : null) ?? undefined
  if (rss_url) confidence.rss = { url: rss_url, status: 'verified', source: 'homepage', checked_at: now }

  let substack_url: string | undefined
  const subFromHome = html ? extractSubstackLink(html) : null
  if (subFromHome) {
    substack_url = subFromHome
    confidence.substack = { url: subFromHome, status: 'verified', source: 'homepage', checked_at: now }
  }
  let newsletter_url: string | undefined

  // --- Layer 2: LLM web-search agent (gated) ------------------------------
  const missing = SOCIAL_PLATFORMS.filter((p) => !socials[p])
  let web_search_used = false
  let fallback_reason: string | undefined

  if (d.webSearch && missing.length > 0) {
    try {
      const ws = await d.webSearch({ domain: clean, companyName: name, missing })
      web_search_used = true
      if (ws) {
        for (const platform of missing) {
          const rawUrl = ws.socials?.[platform]
          if (!rawUrl) continue
          const norm = normalizeChannelUrl(platform, rawUrl)
          if (!norm) continue
          const ev = await validateCandidate(platform, norm, { domain: clean, companyName: name, now, fetchProfile: d.fetchProfile })
          if (ev.status === 'verified') {
            socials[platform] = norm
            confidence[platform] = ev
          } else if (ev.status === 'likely') {
            candidate_channels[platform] = ev
            confidence[platform] = ev
          }
          // rejected → drop (not persisted)
        }

        // Non-social channels — only fill what Layer 1 missed.
        if (!substack_url && ws.substack_url) {
          const norm = normalizeChannelUrl('substack', ws.substack_url)
          if (norm) {
            const verified = bareHost(new URL(norm).hostname).endsWith('.substack.com')
            const ev: ChannelEvidence = {
              url: norm, status: verified ? 'verified' : 'likely',
              source: verified ? 'metadata_match' : 'llm_web_search', checked_at: now,
            }
            if (verified) substack_url = norm
            else candidate_channels.substack = ev
            confidence.substack = ev
          }
        }
        if (!rss_url && ws.rss_url && isSafeUrl(ws.rss_url)) {
          rss_url = ws.rss_url
          confidence.rss = { url: ws.rss_url, status: 'likely', source: 'llm_web_search', checked_at: now }
        }
        if (!newsletter_url && ws.newsletter_url && isSafeUrl(ws.newsletter_url)) {
          // Generic newsletter pages can't be identity-confirmed → candidate only.
          const ev: ChannelEvidence = { url: ws.newsletter_url, status: 'likely', source: 'llm_web_search', checked_at: now }
          candidate_channels.newsletter = ev
          confidence.newsletter = ev
        }
      }
    } catch (err) {
      // Never worse than Layer 1.
      fallback_reason = err instanceof Error ? err.message : 'web search failed'
    }
  }

  const values = Object.values(confidence)
  return {
    name, domain: clean, socials, candidate_channels, rss_url, newsletter_url, substack_url, confidence,
    meta: {
      layer1_found_count: Object.keys(scraped).length,
      missing_platforms: missing,
      web_search_used,
      verified_count: values.filter((e) => e?.status === 'verified').length,
      likely_count: values.filter((e) => e?.status === 'likely').length,
      fallback_reason,
    },
  }
}
