import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/scraper/fetchUrl', () => ({ fetchHtml: vi.fn() }))
vi.mock('@/lib/scraper/jina', () => ({ fetchWithJina: vi.fn() }))
vi.mock('@/lib/scraper/readability', () => ({ extractWithReadability: vi.fn() }))
vi.mock('@/lib/scraper/substack', () => ({
  isSubstack: vi.fn().mockReturnValue(false),
  extractSubstack: vi.fn(),
  fetchSubstackApi: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/scraper/sanitize', () => ({ sanitizeHtml: vi.fn().mockReturnValue('<p>content</p>') }))
vi.mock('@/lib/scraper/markdown', () => ({ toMarkdown: vi.fn() }))

import { scrapeUrl } from '@/lib/scraper'
import { fetchHtml } from '@/lib/scraper/fetchUrl'
import { fetchWithJina } from '@/lib/scraper/jina'
import { extractWithReadability } from '@/lib/scraper/readability'
import { toMarkdown } from '@/lib/scraper/markdown'
import { ExtractionError } from '@/lib/scraper/errors'

const mockFetchHtml = vi.mocked(fetchHtml)
const mockFetchWithJina = vi.mocked(fetchWithJina)
const mockExtractWithReadability = vi.mocked(extractWithReadability)
const mockToMarkdown = vi.mocked(toMarkdown)

const jinaResult = {
  url: 'https://example.com',
  title: 'Example',
  markdownContent: 'content from Jina reader',
  htmlContent: '',
  excerpt: 'content',
  wordCount: 4,
  extractionMethod: 'jina' as const,
}

const readabilityResult = {
  title: 'Example',
  html: '<p>real content</p>',
  author: undefined,
  siteName: undefined,
  publishedAt: undefined,
  excerpt: undefined,
}

beforeEach(() => vi.clearAllMocks())

describe('scrapeUrl', () => {
  it('uses readability result and sets extractionMethod readability', async () => {
    mockFetchHtml.mockResolvedValue('<html><body><article>long content</article></body></html>')
    mockExtractWithReadability.mockResolvedValue(readabilityResult)
    mockToMarkdown.mockReturnValue(
      'This is a long article with plenty of words to easily satisfy the thirty word minimum threshold requirement for the readability extraction path to be taken without triggering the Jina fallback.',
    )

    const result = await scrapeUrl('https://example.com')

    expect(mockFetchWithJina).not.toHaveBeenCalled()
    expect(result.extractionMethod).toBe('readability')
  })

  it('falls back to Jina when FETCH_BLOCKED (403) and sets extractionMethod jina', async () => {
    mockFetchHtml.mockRejectedValue(new Error('FETCH_BLOCKED: 403 Forbidden'))
    mockFetchWithJina.mockResolvedValue(jinaResult)

    const result = await scrapeUrl('https://example.com')

    expect(mockFetchWithJina).toHaveBeenCalledWith('https://example.com')
    expect(result.extractionMethod).toBe('jina')
  })

  it('falls back to Jina when ExtractionError thrown (JS-heavy SPA)', async () => {
    mockFetchHtml.mockResolvedValue('<html><body><div id="root"></div></body></html>')
    mockExtractWithReadability.mockRejectedValue(
      new ExtractionError('Could not extract readable content from page'),
    )
    mockFetchWithJina.mockResolvedValue(jinaResult)

    const result = await scrapeUrl('https://spa-site.com')

    expect(mockFetchWithJina).toHaveBeenCalledWith('https://spa-site.com')
    expect(result.extractionMethod).toBe('jina')
  })

  it('falls back to Jina when readability resolves with too few words (<30)', async () => {
    mockFetchHtml.mockResolvedValue('<html><body><p>Hi</p></body></html>')
    mockExtractWithReadability.mockResolvedValue(readabilityResult)
    mockToMarkdown.mockReturnValue('Hi there. Welcome home.')
    mockFetchWithJina.mockResolvedValue(jinaResult)

    const result = await scrapeUrl('https://thin-site.com')

    expect(mockFetchWithJina).toHaveBeenCalledWith('https://thin-site.com')
    expect(result.extractionMethod).toBe('jina')
  })

  it('does NOT fall back to Jina for unrecognised extraction errors', async () => {
    mockFetchHtml.mockResolvedValue('<html><body>content</body></html>')
    mockExtractWithReadability.mockRejectedValue(new Error('SOME_OTHER_ERROR: unexpected'))

    await expect(scrapeUrl('https://example.com')).rejects.toThrow('SOME_OTHER_ERROR')
    expect(mockFetchWithJina).not.toHaveBeenCalled()
  })

  it('falls back to Jina on a bare network TypeError (undici "fetch failed")', async () => {
    mockFetchHtml.mockRejectedValue(new TypeError('fetch failed'))
    mockFetchWithJina.mockResolvedValue(jinaResult)

    const result = await scrapeUrl('https://example.com')

    expect(mockFetchWithJina).toHaveBeenCalledWith('https://example.com')
    expect(result.extractionMethod).toBe('jina')
  })

  it('falls back to Jina on FETCH_TIMEOUT', async () => {
    mockFetchHtml.mockRejectedValue(new Error('FETCH_TIMEOUT: Request exceeded 12s'))
    mockFetchWithJina.mockResolvedValue(jinaResult)

    const result = await scrapeUrl('https://example.com')

    expect(mockFetchWithJina).toHaveBeenCalledWith('https://example.com')
    expect(result.extractionMethod).toBe('jina')
  })

  it('does NOT fall back to Jina for a malformed URL', async () => {
    mockFetchHtml.mockRejectedValue(new Error('FETCH_FAILED: Malformed URL — bad'))

    await expect(scrapeUrl('bad')).rejects.toThrow('Malformed URL')
    expect(mockFetchWithJina).not.toHaveBeenCalled()
  })

  it('surfaces the original FETCH_UNREACHABLE when Jina also fails', async () => {
    mockFetchHtml.mockRejectedValue(new Error('FETCH_UNREACHABLE: Could not connect to https://down.test'))
    mockFetchWithJina.mockRejectedValue(new Error('JINA_FAILED: HTTP 422'))

    await expect(scrapeUrl('https://down.test')).rejects.toThrow('FETCH_UNREACHABLE')
  })

  it('surfaces the Jina error for a blocked site when Jina also fails', async () => {
    mockFetchHtml.mockRejectedValue(new Error('FETCH_BLOCKED: 403 Forbidden'))
    mockFetchWithJina.mockRejectedValue(new Error('JINA_FAILED: HTTP 429'))

    await expect(scrapeUrl('https://blocked.test')).rejects.toThrow('JINA_FAILED')
  })
})
