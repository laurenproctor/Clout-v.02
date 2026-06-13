import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/scraper/blogDiscovery', () => ({ discoverBlogPosts: vi.fn() }))
vi.mock('@/lib/scraper', () => ({ scrapeUrl: vi.fn() }))
vi.mock('@/lib/ai/generate', () => ({ callClaude: vi.fn() }))

import { analyzeBlogIndexForOpportunities } from '@/lib/website-intelligence/analyze'
import { discoverBlogPosts } from '@/lib/scraper/blogDiscovery'
import { scrapeUrl } from '@/lib/scraper'
import { callClaude } from '@/lib/ai/generate'

const mockDiscover = vi.mocked(discoverBlogPosts)
const mockScrape = vi.mocked(scrapeUrl)
const mockClaude = vi.mocked(callClaude)

function analysisJson(assetTitle: string, score: number) {
  return JSON.stringify({
    assets: [{ id: 'asset-1', type: 'blog', title: assetTitle, url: 'x', services: [], extracted_quotes: [], extracted_statistics: [], extracted_proof_points: [] }],
    items: [{ id: 'opp-1', asset_id: 'asset-1', title: `Opp for ${assetTitle}`, score, confidence: 80, status: 'new', level: 'high', category: 'promotion', tags: [], matched_service: '', source_type: 'Blog Post', why_this_matters: '', reasons: [], formats: [] }],
    gaps: [{ id: 'gap-1', headline: 'Shared gap', detail: '', opportunity: '', matched_service: '', tags: [] }],
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockScrape.mockImplementation(async (url: string) => ({
    url, title: `Title ${url}`, markdownContent: 'body content here', htmlContent: '', excerpt: '', wordCount: 50, extractionMethod: 'readability' as const,
  }))
})

describe('analyzeBlogIndexForOpportunities', () => {
  it('returns null when no posts are discovered', async () => {
    mockDiscover.mockResolvedValue(null)
    expect(await analyzeBlogIndexForOpportunities('https://x.com/blog')).toBeNull()
  })

  it('namespaces ids per post and rewrites asset_id links', async () => {
    mockDiscover.mockResolvedValue([
      { url: 'https://x.com/a' },
      { url: 'https://x.com/b' },
    ])
    mockClaude
      .mockResolvedValueOnce({ content: analysisJson('Post A', 90) } as never)
      .mockResolvedValueOnce({ content: analysisJson('Post B', 70) } as never)

    const result = await analyzeBlogIndexForOpportunities('https://x.com/blog')
    expect(result).not.toBeNull()

    // One asset per post — namespaced per-post so there are no id collisions.
    expect(new Set(result!.assets.map(a => a.id)).size).toBe(2)
    // Every item references an asset id that shares its own post prefix.
    for (const item of result!.items) {
      const prefix = item.id.replace(/opp-\d+$/, '')
      expect(item.asset_id).toBe(`${prefix}asset-1`)
    }
    // Items sorted by score desc.
    expect(result!.items.map(i => i.score)).toEqual([90, 70])
    // Duplicate gap headline collapses to one.
    expect(result!.gaps).toHaveLength(1)
  })

  it('derives stable ids from the post url, independent of discovery order', async () => {
    // Re-analysis must not give a post a different id just because discovery
    // returned it in a different position — the id is keyed to the post url.
    // Embed the analyzed url in the item title so we can map item -> post url.
    mockClaude.mockImplementation(async ({ userMessage }) => {
      const url = userMessage.match(/Website URL: (\S+)/)![1]
      return { content: analysisJson(url, 80) } as never
    })
    const idForUrl = (r: Awaited<ReturnType<typeof analyzeBlogIndexForOpportunities>>, url: string) =>
      r!.items.find(i => i.title === `Opp for ${url}`)!.id

    mockDiscover.mockResolvedValue([{ url: 'https://x.com/a' }, { url: 'https://x.com/b' }])
    const first = await analyzeBlogIndexForOpportunities('https://x.com/blog')

    mockDiscover.mockResolvedValue([{ url: 'https://x.com/b' }, { url: 'https://x.com/a' }])
    const second = await analyzeBlogIndexForOpportunities('https://x.com/blog')

    // The post at /a keeps the same id even though it moved from index 0 to 1.
    expect(idForUrl(first, 'https://x.com/a')).toBe(idForUrl(second, 'https://x.com/a'))
    expect(idForUrl(first, 'https://x.com/b')).toBe(idForUrl(second, 'https://x.com/b'))
    // And the two posts still get distinct ids.
    expect(idForUrl(first, 'https://x.com/a')).not.toBe(idForUrl(first, 'https://x.com/b'))
  })

  it('skips posts that fail to scrape but keeps the rest', async () => {
    mockDiscover.mockResolvedValue([
      { url: 'https://x.com/good' },
      { url: 'https://x.com/bad' },
    ])
    mockScrape.mockImplementation(async (url: string) => {
      if (url.endsWith('/bad')) throw new Error('FETCH_FAILED')
      return { url, title: 'ok', markdownContent: 'content', htmlContent: '', excerpt: '', wordCount: 50, extractionMethod: 'readability' as const }
    })
    mockClaude.mockResolvedValue({ content: analysisJson('Good', 80) } as never)

    const result = await analyzeBlogIndexForOpportunities('https://x.com/blog')
    expect(result!.assets).toHaveLength(1)
    expect(result!.items).toHaveLength(1)
  })
})
