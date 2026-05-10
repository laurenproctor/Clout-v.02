import * as cheerio from 'cheerio'
import type { ExtractionResult } from './types'

// ─── Detection ─────────────────────────────────────────────────────────────

export function isSubstack(url: string, html: string): boolean {
  try {
    const { hostname } = new URL(url)
    if (hostname.endsWith('.substack.com')) return true
  } catch {
    // ignore
  }

  // meta generator tag
  if (/<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*[Ss]ubstack/i.test(html)) return true
  if (/<meta[^>]+content=["'][^"']*[Ss]ubstack[^"']*["'][^>]+name=["']generator["']/i.test(html)) return true

  // __NEXT_DATA__ presence + Substack signal
  if (html.includes('__NEXT_DATA__') && html.includes('substack')) return true

  // Substack-specific CSS classes
  if (html.includes('post-content') && html.includes('substack-post-content')) return true
  if (html.includes('frontend.substack-cdn.com')) return true

  return false
}

// ─── JSON-LD extraction ─────────────────────────────────────────────────────

interface JsonLdArticle {
  headline?: string
  name?: string
  author?: { name?: string } | { name?: string }[]
  publisher?: { name?: string }
  datePublished?: string
  description?: string
}

function extractJsonLd(html: string): Partial<ExtractionResult> {
  const result: Partial<ExtractionResult> = {}
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]!) as JsonLdArticle | { '@graph': JsonLdArticle[] }
      const article = ('@graph' in data)
        ? data['@graph'].find(n => n.headline || n.name)
        : data
      if (!article) continue

      if (article.headline || article.name) {
        result.title = (article.headline ?? article.name ?? '').trim()
      }
      if (article.author) {
        const auth = Array.isArray(article.author) ? article.author[0] : article.author
        result.author = auth?.name?.trim()
      }
      if (article.publisher?.name) result.siteName = article.publisher.name.trim()
      if (article.datePublished) result.publishedAt = article.datePublished.trim()
      if (article.description) result.excerpt = article.description.trim()
      if (result.title) break
    } catch {
      // continue to next match
    }
  }
  return result
}

// ─── __NEXT_DATA__ extraction ───────────────────────────────────────────────

interface NextDataPost {
  title?: string
  canonical_url?: string
  description?: string
  body_html?: string
  subtitle?: string
  byline?: string
  publishedBylines?: { name?: string }[]
  post_date?: string
  publication?: { name?: string }
}

function extractNextData(html: string): { meta: Partial<ExtractionResult>; bodyHtml: string | null } {
  const meta: Partial<ExtractionResult> = {}
  let bodyHtml: string | null = null

  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return { meta, bodyHtml }

  try {
    const data = JSON.parse(match[1]!) as {
      props?: { pageProps?: { post?: NextDataPost; publication?: { name?: string } } }
    }
    const post = data?.props?.pageProps?.post
    const publication = data?.props?.pageProps?.publication

    if (!post) return { meta, bodyHtml }

    if (post.title) meta.title = post.title.trim()
    if (post.description || post.subtitle) meta.excerpt = (post.description ?? post.subtitle ?? '').trim()

    // Author from publishedBylines or byline string
    if (post.publishedBylines?.length) {
      meta.author = post.publishedBylines.map(b => b.name).filter(Boolean).join(', ')
    } else if (post.byline) {
      meta.author = post.byline.trim()
    }

    if (post.publication?.name) meta.siteName = post.publication.name
    else if (publication?.name) meta.siteName = publication.name

    if (post.post_date) meta.publishedAt = post.post_date

    if (post.body_html) bodyHtml = post.body_html
  } catch {
    // ignore parse errors
  }

  return { meta, bodyHtml }
}

// ─── Meta tag extraction ────────────────────────────────────────────────────

function extractMeta(html: string): Partial<ExtractionResult> {
  const result: Partial<ExtractionResult> = {}

  const ogTitle = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (ogTitle) result.title = decodeEntities(ogTitle[1]!)

  const ogDesc = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (ogDesc) result.excerpt = decodeEntities(ogDesc[1]!)

  const ogSite = /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (ogSite) result.siteName = decodeEntities(ogSite[1]!)

  const twitterTitle = /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (!result.title && twitterTitle) result.title = decodeEntities(twitterTitle[1]!)

  const articleAuthor = /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (articleAuthor) result.author = decodeEntities(articleAuthor[1]!)

  const articleDate = /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (articleDate) result.publishedAt = articleDate[1]!

  const docTitle = /<title[^>]*>([^<]+)<\/title>/i.exec(html)
  if (!result.title && docTitle) result.title = decodeEntities(docTitle[1]!.split('|')[0]!.split('–')[0]!.trim())

  return result
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// ─── DOM extraction ─────────────────────────────────────────────────────────

// Ordered from most to least specific for Substack article bodies
const SUBSTACK_CONTENT_SELECTORS = [
  '.available-content',
  '.body.markup',
  '.post-content',
  'div[class*="post-content"]',
  'article .markup',
  '.paywall-content',
  'article',
  'main',
]

function extractBodyFromDom(html: string): string | null {
  const $ = cheerio.load(html)

  for (const sel of SUBSTACK_CONTENT_SELECTORS) {
    const el = $(sel).first()
    if (el.length === 0) continue
    const text = el.text().trim()
    if (text.length < 200) continue
    return el.html() ?? null
  }

  return null
}

// ─── Main extractor ─────────────────────────────────────────────────────────

export function extractSubstack(html: string): ExtractionResult {
  // Layer 1: __NEXT_DATA__ (richest source — has body_html)
  const { meta: nextMeta, bodyHtml: nextBodyHtml } = extractNextData(html)

  // Layer 2: JSON-LD
  const jsonLdMeta = extractJsonLd(html)

  // Layer 3: meta tags
  const metaMeta = extractMeta(html)

  // Merge metadata: prefer __NEXT_DATA__ > JSON-LD > meta tags
  const title = nextMeta.title ?? jsonLdMeta.title ?? metaMeta.title ?? ''
  const author = nextMeta.author ?? jsonLdMeta.author ?? metaMeta.author
  const siteName = nextMeta.siteName ?? jsonLdMeta.siteName ?? metaMeta.siteName
  const publishedAt = nextMeta.publishedAt ?? jsonLdMeta.publishedAt ?? metaMeta.publishedAt
  const excerpt = nextMeta.excerpt ?? jsonLdMeta.excerpt ?? metaMeta.excerpt

  // Body HTML: prefer __NEXT_DATA__.body_html, then DOM extraction
  const bodyHtml = nextBodyHtml ?? extractBodyFromDom(html)

  if (!bodyHtml || bodyHtml.trim().length < 100) {
    throw new Error('EXTRACTION_FAILED: Could not extract Substack article body')
  }

  return { title, author, siteName, publishedAt, html: bodyHtml, excerpt }
}
