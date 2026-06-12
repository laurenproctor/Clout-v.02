import { scrapeUrl } from '@/lib/scraper'
import { discoverBlogPosts } from '@/lib/scraper/blogDiscovery'
import { callClaude } from '@/lib/ai/generate'
import type { WebsiteOpportunity, WebsiteContentGap, WebsiteAsset } from '@/types/feed'

export interface WebsiteAnalysisResult {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  assets: WebsiteAsset[]
  meta: {
    extractionMethod: 'readability' | 'jina'
    durationMs: number
    version: number
  }
}

const SYSTEM_PROMPT = `You are a content strategist analyzing a company's website to identify high-impact content opportunities for LinkedIn and other professional channels.

Given the scraped content of a website homepage or page, return a JSON object with this exact structure:

{
  "assets": [
    {
      "id": "asset-1",
      "type": "homepage" | "service" | "product" | "case_study" | "testimonial" | "report" | "blog" | "resource" | "about",
      "title": "string",
      "url": "string (use the page URL)",
      "services": ["string"],
      "extracted_quotes": ["string"],
      "extracted_statistics": ["string"],
      "extracted_proof_points": ["string"]
    }
  ],
  "items": [
    {
      "id": "opp-1",
      "asset_id": "asset-1",
      "title": "string (compelling content opportunity title)",
      "score": 0-100,
      "confidence": 0-100,
      "status": "new",
      "level": "high" | "medium" | "emerging",
      "category": "promotion" | "repurpose" | "gap" | "trend_match" | "thought_leadership",
      "tags": ["string"],
      "matched_service": "string",
      "source_type": "string (e.g. 'Homepage', 'Service Page', 'Blog Post')",
      "why_this_matters": "string (1-2 sentences explaining the business opportunity)",
      "reasons": [
        {
          "type": "never_promoted" | "contains_statistics" | "contains_testimonials" | "service_alignment" | "high_momentum" | "evergreen_content" | "trend_match",
          "score": 0-100,
          "explanation": "string"
        }
      ],
      "formats": ["LinkedIn post", "Thread", "Short-form video", "Newsletter section"]
    }
  ],
  "gaps": [
    {
      "id": "gap-1",
      "headline": "string (content gap title)",
      "detail": "string (what's missing and why it matters)",
      "opportunity": "string (what to create)",
      "matched_service": "string",
      "tags": ["string"]
    }
  ]
}

Rules:
- Identify 2-5 assets from the page content
- Generate 3-8 content opportunities with scores 60-100 for high-value content
- Generate 2-4 content gaps (topics they should be talking about but aren't)
- Score based on: proof points (stats, testimonials), promotional potential, freshness
- level "high" = score 80+, "medium" = 60-79, "emerging" = below 60
- Be specific and actionable — base everything on actual content found on the page
- If the page has very little content, still try to identify at least 1-2 opportunities
- Output ONLY valid JSON. No markdown, no explanation.`

type ParsedAnalysis = Omit<WebsiteAnalysisResult, 'meta'>

function parseAnalysisResponse(content: string): ParsedAnalysis {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[website-intelligence/analyze] no JSON in Claude response, first 500 chars:', content.slice(0, 500))
    throw new Error('ANALYSIS_PARSE_FAILED: Claude did not return valid JSON')
  }
  let parsed: WebsiteAnalysisResult
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('[website-intelligence/analyze] JSON.parse failed:', err, '— snippet:', jsonMatch[0].slice(0, 500))
    throw new Error('ANALYSIS_PARSE_FAILED: Could not parse Claude response as JSON')
  }
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    assets: Array.isArray(parsed.assets) ? parsed.assets : [],
  }
}

export async function analyzeWebsiteForOpportunities(url: string): Promise<WebsiteAnalysisResult> {
  const start = Date.now()
  const scraped = await scrapeUrl(url)

  const userMessage = `Website URL: ${url}
Page title: ${scraped.title ?? 'Unknown'}
Site name: ${scraped.siteName ?? 'Unknown'}

## Page content (up to 6000 chars):
${scraped.markdownContent.slice(0, 6000)}`

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
  })

  const parsed = parseAnalysisResponse(result.content)
  return {
    ...parsed,
    meta: {
      extractionMethod: scraped.extractionMethod,
      durationMs: Date.now() - start,
      version: 1,
    },
  }
}

/** Cap on how many blog posts a single index URL will fan out to. */
const MAX_BLOG_POSTS = 25
/** How many post analyses to run at once. */
const BLOG_CONCURRENCY = 5
/** Bounds on the merged result so the cache/UI don't get flooded. */
const MAX_MERGED_ITEMS = 60
const MAX_MERGED_GAPS = 8

/** Run an async mapper over items with a fixed concurrency ceiling. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i]!, i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

/**
 * Merge per-post analyses into one result. Each post's analysis independently
 * emits `asset-1`/`opp-1`/`gap-1`, so we namespace every id by post index and
 * rewrite the `asset_id` references that link opportunities to their asset.
 */
function mergeBlogResults(
  results: Array<ParsedAnalysis | null>,
  meta: WebsiteAnalysisResult['meta'],
): WebsiteAnalysisResult {
  const assets: WebsiteAsset[] = []
  const items: WebsiteOpportunity[] = []
  const gaps: WebsiteContentGap[] = []

  results.forEach((res, i) => {
    if (!res) return
    const prefix = `p${i}-`
    for (const asset of res.assets) {
      assets.push({ ...asset, id: `${prefix}${asset.id}` })
    }
    for (const item of res.items) {
      items.push({
        ...item,
        id: `${prefix}${item.id}`,
        asset_id: item.asset_id ? `${prefix}${item.asset_id}` : item.asset_id,
      })
    }
    for (const gap of res.gaps) {
      gaps.push({ ...gap, id: `${prefix}${gap.id}` })
    }
  })

  const topItems = [...items]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_MERGED_ITEMS)

  const seenGap = new Set<string>()
  const dedupedGaps = gaps.filter(g => {
    const key = (g.headline ?? '').toLowerCase().trim()
    if (!key || seenGap.has(key)) return false
    seenGap.add(key)
    return true
  }).slice(0, MAX_MERGED_GAPS)

  return { assets, items: topItems, gaps: dedupedGaps, meta }
}

/**
 * Analyze a blog index URL by discovering its individual posts and analyzing
 * each one. Returns `null` when the URL is not a blog index (no posts found),
 * so callers can fall back to single-page analysis.
 */
export async function analyzeBlogIndexForOpportunities(
  url: string,
  limit = MAX_BLOG_POSTS,
): Promise<WebsiteAnalysisResult | null> {
  const start = Date.now()
  const posts = await discoverBlogPosts(url, limit)
  if (!posts || posts.length === 0) return null

  console.info(`[website-intelligence/analyze] discovered ${posts.length} blog posts from ${url}`)

  const results = await mapWithConcurrency(posts, BLOG_CONCURRENCY, async post => {
    try {
      const scraped = await scrapeUrl(post.url)
      const analysis = await analyzeScrapedContent(
        scraped.markdownContent,
        post.url,
        scraped.title ?? post.title ?? post.url,
        scraped.siteName,
      )
      return analysis
    } catch (err) {
      console.warn(`[website-intelligence/analyze] skipped post ${post.url}:`, err instanceof Error ? err.message : err)
      return null
    }
  })

  const succeeded = results.filter((r): r is ParsedAnalysis => r !== null)
  if (succeeded.length === 0) return null

  return mergeBlogResults(results, {
    extractionMethod: 'readability',
    durationMs: Date.now() - start,
    version: 1,
  })
}

/**
 * Analyze any URL for content opportunities. Tries blog-index discovery first
 * (fans out to individual posts); falls back to single-page analysis otherwise.
 */
export async function analyzeUrlForOpportunities(url: string): Promise<WebsiteAnalysisResult> {
  const blog = await analyzeBlogIndexForOpportunities(url)
  if (blog) return blog
  return analyzeWebsiteForOpportunities(url)
}

/** Run the opportunity-analysis prompt over already-scraped markdown content. */
async function analyzeScrapedContent(
  markdown: string,
  url: string,
  title: string,
  siteName?: string,
): Promise<ParsedAnalysis> {
  const userMessage = `Website URL: ${url}
Page title: ${title}
Site name: ${siteName ?? 'Unknown'}

## Page content (up to 6000 chars):
${markdown.slice(0, 6000)}`

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
  })
  return parseAnalysisResponse(result.content)
}

export async function analyzeContentForOpportunities(
  text: string,
  sourceUrl: string,
  sourceName: string,
): Promise<WebsiteAnalysisResult> {
  const start = Date.now()
  const userMessage = `Source name: ${sourceName}
Source URL: ${sourceUrl}

## Content (up to 6000 chars):
${text.slice(0, 6000)}`

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
  })

  const parsed = parseAnalysisResponse(result.content)
  return {
    ...parsed,
    meta: {
      extractionMethod: 'readability',
      durationMs: Date.now() - start,
      version: 1,
    },
  }
}
