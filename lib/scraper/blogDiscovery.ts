import * as cheerio from 'cheerio'
import { isSafeUrl } from './isSafeUrl'

export interface DiscoveredPost {
  url: string
  title?: string
  publishedAt?: string
}

const FETCH_TIMEOUT_MS = 10_000

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Path segments that are never individual blog posts on common CMS platforms.
const NON_POST_SEGMENTS = new Set([
  'about', 'about-us', 'contact', 'contact-us', 'privacy', 'privacy-policy',
  'terms', 'terms-of-service', 'cookie-policy', 'sitemap', 'search', 'login',
  'cart', 'checkout', 'account', 'shop', 'store', 'home', 'index',
])

// Path prefixes that signal taxonomy/pagination/feeds rather than a post.
const NON_POST_PREFIXES = [
  '/category/', '/categories/', '/tag/', '/tags/', '/author/', '/authors/',
  '/page/', '/feed', '/comments/', '/wp-json', '/wp-content', '/wp-admin',
  '/wp-includes', '/xmlrpc', '/cdn-cgi/',
]

/**
 * Same-site check used to keep discovered posts on the user's own domain.
 * Feeds, WordPress APIs, and sitemaps can surface off-domain URLs — syndicated
 * items, aggregator feeds, third-party widgets — which must not be presented as
 * the user's own content. Matches on hostname, treating `www.` and subdomains
 * (e.g. blog.example.com ↔ example.com) as the same site, while rejecting
 * unrelated hosts (medium.com, feeds.feedburner.com) and suffix look-alikes
 * (notexample.com). Comparing against the full base hostname — rather than a
 * guessed registrable domain — keeps multi-part TLDs (example.co.uk) correct
 * without a public-suffix list.
 */
export function isSameSite(candidateUrl: string, baseUrl: string): boolean {
  let c: string
  let b: string
  try {
    c = new URL(candidateUrl).hostname.toLowerCase().replace(/^www\./, '')
    b = new URL(baseUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return false
  }
  if (!c || !b) return false
  return c === b || c.endsWith(`.${b}`) || b.endsWith(`.${c}`)
}

/** Drop any discovered posts whose url is not on the same site as `baseUrl`. */
function filterToSite(posts: DiscoveredPost[], baseUrl: string): DiscoveredPost[] {
  return posts.filter(p => isSameSite(p.url, baseUrl))
}

/** Decode the handful of HTML entities that show up in WP/RSS titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Parse the WordPress REST API `/wp-json/wp/v2/posts` response. */
export function parseWpPosts(json: string, limit: number): DiscoveredPost[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const posts: DiscoveredPost[] = []
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const url = typeof rec.link === 'string' ? rec.link : undefined
    if (!url) continue
    const titleObj = rec.title as { rendered?: unknown } | undefined
    const title =
      titleObj && typeof titleObj.rendered === 'string'
        ? decodeEntities(titleObj.rendered)
        : undefined
    const publishedAt = typeof rec.date === 'string' ? rec.date : undefined
    posts.push({ url, ...(title ? { title } : {}), ...(publishedAt ? { publishedAt } : {}) })
    if (posts.length >= limit) break
  }
  return posts
}

/** Parse an RSS 2.0 or Atom feed into discovered posts. */
export function parseFeed(xml: string, limit: number): DiscoveredPost[] {
  let $: ReturnType<typeof cheerio.load>
  try {
    $ = cheerio.load(xml, { xmlMode: true })
  } catch {
    return []
  }

  const posts: DiscoveredPost[] = []

  // RSS 2.0 — <item><link>url</link></item>
  $('item').each((_, el) => {
    if (posts.length >= limit) return
    const item = $(el)
    const url = item.find('link').first().text().trim()
    if (!url) return
    const title = decodeEntities(item.find('title').first().text())
    const publishedAt = item.find('pubDate').first().text().trim() || undefined
    posts.push({ url, ...(title ? { title } : {}), ...(publishedAt ? { publishedAt } : {}) })
  })

  if (posts.length > 0) return posts

  // Atom — <entry><link href="url"/></entry>
  $('entry').each((_, el) => {
    if (posts.length >= limit) return
    const entry = $(el)
    const links = entry.find('link')
    let href = ''
    links.each((_i, l) => {
      const rel = $(l).attr('rel')
      if (!href && (!rel || rel === 'alternate')) href = $(l).attr('href')?.trim() ?? ''
    })
    if (!href) return
    const title = decodeEntities(entry.find('title').first().text())
    const publishedAt =
      entry.find('published').first().text().trim() ||
      entry.find('updated').first().text().trim() ||
      undefined
    posts.push({ url: href, ...(title ? { title } : {}), ...(publishedAt ? { publishedAt } : {}) })
  })

  return posts
}

/** Parse a sitemap `<urlset>` into discovered posts. Ignores `<sitemapindex>`. */
export function parseSitemap(xml: string, limit: number): DiscoveredPost[] {
  let $: ReturnType<typeof cheerio.load>
  try {
    $ = cheerio.load(xml, { xmlMode: true })
  } catch {
    return []
  }
  if ($('sitemapindex').length > 0) return []

  const posts: DiscoveredPost[] = []
  $('urlset > url').each((_, el) => {
    if (posts.length >= limit) return
    const url = $(el).find('loc').first().text().trim()
    if (!url) return
    const publishedAt = $(el).find('lastmod').first().text().trim() || undefined
    posts.push({ url, ...(publishedAt ? { publishedAt } : {}) })
  })
  return posts
}

/** Find an RSS/Atom autodiscovery <link> in page HTML and resolve it absolutely. */
export function discoverFeedUrl(html: string, baseUrl: string): string | null {
  let $: ReturnType<typeof cheerio.load>
  try {
    $ = cheerio.load(html)
  } catch {
    return null
  }
  const href = $(
    'link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]',
  )
    .first()
    .attr('href')
  if (!href) return null
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function looksLikePost(pathname: string, indexPath: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/' || path === '') return false
  if (path === indexPath.replace(/\/+$/, '')) return false
  for (const prefix of NON_POST_PREFIXES) {
    if (path.toLowerCase().startsWith(prefix)) return false
  }
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1]!.toLowerCase()
  if (NON_POST_SEGMENTS.has(last)) return false
  // Pagination like /supplement-source/2 — a numeric trailing segment.
  if (/^\d+$/.test(last)) return false
  if (/\.(xml|json|rss|atom|php|jpg|jpeg|png|gif|svg|webp|pdf)$/i.test(last)) return false
  return true
}

/**
 * Last-resort fallback: pull same-origin, post-like links out of an index page.
 * Conservative — only keeps links whose path looks like an article slug.
 */
export function extractPostLinks(html: string, baseUrl: string, limit: number): DiscoveredPost[] {
  let $: ReturnType<typeof cheerio.load>
  try {
    $ = cheerio.load(html)
  } catch {
    return []
  }

  let base: URL
  try {
    base = new URL(baseUrl)
  } catch {
    return []
  }
  const indexPath = base.pathname

  const seen = new Set<string>()
  const posts: DiscoveredPost[] = []

  $('a[href]').each((_, el) => {
    if (posts.length >= limit) return
    const raw = $(el).attr('href')
    if (!raw) return
    let u: URL
    try {
      u = new URL(raw, baseUrl)
    } catch {
      return
    }
    if (!isSameSite(u.href, baseUrl)) return
    if (!looksLikePost(u.pathname, indexPath)) return

    const normalized = `${u.origin}${u.pathname.replace(/\/+$/, '')}`
    if (seen.has(normalized)) return
    seen.add(normalized)

    const title = $(el).text().replace(/\s+/g, ' ').trim() || undefined
    posts.push({ url: normalized, ...(title ? { title } : {}) })
  })

  return posts
}

/** Fetch text without throwing on non-2xx — returns null on any failure. */
async function fetchTextSafe(
  url: string,
  accept: string,
): Promise<{ status: number; text: string } | null> {
  if (!isSafeUrl(url)) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
    })
    const text = await res.text()
    return { status: res.status, text }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Given a blog index / listing URL, discover individual post URLs.
 *
 * Tries, in order of reliability:
 *   1. WordPress REST API (`/wp-json/wp/v2/posts`)
 *   2. RSS/Atom feed (autodiscovery link, then common paths)
 *   3. Sitemap (`/post-sitemap.xml`, then `/sitemap.xml`)
 *   4. Same-origin post-like links scraped from the index page
 *
 * Returns up to `limit` most-recent posts, or `null` when the URL does not
 * look like a blog index (so callers can fall back to single-page analysis).
 */
export async function discoverBlogPosts(
  url: string,
  limit = 25,
): Promise<DiscoveredPost[] | null> {
  if (!isSafeUrl(url)) return null
  let origin: string
  try {
    origin = new URL(url).origin
  } catch {
    return null
  }

  // 1. WordPress REST API — most reliable, returns structured data.
  const wp = await fetchTextSafe(
    `${origin}/wp-json/wp/v2/posts?per_page=${limit}&orderby=date&_fields=link,title,date`,
    'application/json',
  )
  if (wp && wp.status === 200) {
    const posts = filterToSite(parseWpPosts(wp.text, limit), url)
    if (posts.length > 0) return posts
  }

  // Fetch the index page once — used for feed autodiscovery and link fallback.
  const page = await fetchTextSafe(url, 'text/html,application/xhtml+xml')

  // 2. RSS/Atom feed.
  const feedCandidates: string[] = []
  if (page?.text) {
    const discovered = discoverFeedUrl(page.text, url)
    if (discovered) feedCandidates.push(discovered)
  }
  feedCandidates.push(
    new URL('feed/', url.endsWith('/') ? url : `${url}/`).toString(),
    `${origin}/feed/`,
    `${origin}/rss/`,
    `${origin}/feed.xml`,
    `${origin}/atom.xml`,
  )
  for (const feedUrl of dedupe(feedCandidates)) {
    const feed = await fetchTextSafe(feedUrl, 'application/rss+xml,application/atom+xml,application/xml')
    if (feed && feed.status === 200) {
      const posts = filterToSite(parseFeed(feed.text, limit), url)
      if (posts.length > 0) return posts
    }
  }

  // 3. Sitemap.
  for (const sitemapUrl of [`${origin}/post-sitemap.xml`, `${origin}/sitemap.xml`]) {
    const sm = await fetchTextSafe(sitemapUrl, 'application/xml,text/xml')
    if (sm && sm.status === 200) {
      const posts = filterToSite(parseSitemap(sm.text, limit), url)
      if (posts.length > 0) return posts
    }
  }

  // 4. Same-origin link extraction from the index page.
  if (page?.text) {
    const posts = extractPostLinks(page.text, url, limit)
    if (posts.length >= 2) return posts
  }

  return null
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}
