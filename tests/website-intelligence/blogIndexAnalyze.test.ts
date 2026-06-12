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

    // One asset per post, namespaced — no id collisions.
    expect(result!.assets.map(a => a.id).sort()).toEqual(['p0-asset-1', 'p1-asset-1'])
    // Items reference their post's namespaced asset id.
    const item0 = result!.items.find(i => i.id === 'p0-opp-1')!
    expect(item0.asset_id).toBe('p0-asset-1')
    // Items sorted by score desc.
    expect(result!.items.map(i => i.score)).toEqual([90, 70])
    // Duplicate gap headline collapses to one.
    expect(result!.gaps).toHaveLength(1)
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
