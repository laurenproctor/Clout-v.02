const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest'

export interface NewsdataArticle {
  article_id: string
  title: string
  link: string
  keywords: string[] | null
  description: string | null
  pubDate: string
  source_id: string
  source_name: string
  source_url: string
  language: string
  category: string[]
  sentiment: 'positive' | 'negative' | 'neutral' | null
  duplicate: boolean
}

interface NewsdataResponse {
  status: string
  totalResults: number
  results: NewsdataArticle[]
  nextPage: string | null
}

interface SearchOpts {
  language?: string
  page?: string
  titleOnly?: boolean
}

export type ProviderErrorCode =
  | 'rate_limited'
  | 'http_error'
  | 'invalid_response'
  | 'api_error'
  | 'missing_api_key'
  | 'timeout'
  | 'unexpected_error'

// `message` is for server-side logs only — never forward it to the client.
export interface ProviderError {
  code: ProviderErrorCode
  message: string
  retryable: boolean
  status?: number
}

export interface SearchResult {
  articles: NewsdataArticle[]
  nextPage: string | null
  error?: ProviderError
}

// Keywords that identify financial/stock-market reports — not editorial signals
const FINANCIAL_SPAM_PATTERNS = [
  /^"?symbol:/i,
  /^"?category:\s*(earnings|small cap|large cap|mid cap)/i,
]

function isFinancialSpam(article: NewsdataArticle): boolean {
  const keywords = article.keywords ?? []
  if (keywords.some(k => FINANCIAL_SPAM_PATTERNS.some(p => p.test(k)))) return true
  // Skip corporate earnings/pricing announcements
  return /\b(announces? pricing of|reports (first|second|third|fourth|q[1-4]) quarter|provides capital markets update|fy\d{2} results)\b/i.test(
    article.title
  )
}

export async function searchLatest(
  query: string,
  opts: SearchOpts = {}
): Promise<SearchResult> {
  const apiKey = process.env.NEWSDATA_API_KEY
  if (!apiKey) {
    console.error('[newsdata] NEWSDATA_API_KEY is not set')
    return {
      articles: [],
      nextPage: null,
      error: { code: 'missing_api_key', message: 'NEWSDATA_API_KEY is not set', retryable: false },
    }
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    language: opts.language ?? 'en',
    prioritydomain: 'top',
  })
  // Use qInTitle for higher relevance — only match articles where the topic
  // appears in the headline, not buried in unrelated metadata
  if (opts.titleOnly) {
    params.set('qInTitle', query)
  } else {
    params.set('q', query)
  }
  if (opts.page) params.set('page', opts.page)

  const url = `${NEWSDATA_BASE}?${params.toString()}`

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    // AbortSignal.timeout fires a DOMException named 'TimeoutError' (or 'AbortError')
    const isTimeout = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')
    if (isTimeout) {
      console.error('[newsdata] request timed out for query "%s"', query)
      return {
        articles: [],
        nextPage: null,
        error: { code: 'timeout', message: 'NewsData request timed out', retryable: true },
      }
    }
    console.error('[newsdata] fetch error for query "%s":', query, err)
    return {
      articles: [],
      nextPage: null,
      error: { code: 'unexpected_error', message: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`, retryable: true },
    }
  }

  if (res.status === 429) {
    console.warn('[newsdata] rate limited on query "%s" — skipping', query)
    return {
      articles: [],
      nextPage: null,
      error: { code: 'rate_limited', message: 'NewsData rate limit (HTTP 429)', retryable: true, status: 429 },
    }
  }

  if (!res.ok) {
    console.error('[newsdata] HTTP %d for query "%s"', res.status, query)
    return {
      articles: [],
      nextPage: null,
      error: {
        code: 'http_error',
        message: `NewsData returned HTTP ${res.status}`,
        retryable: res.status === 429 || res.status >= 500,
        status: res.status,
      },
    }
  }

  let data: NewsdataResponse
  try {
    data = await res.json()
  } catch {
    console.error('[newsdata] invalid JSON for query "%s"', query)
    return {
      articles: [],
      nextPage: null,
      error: { code: 'invalid_response', message: 'NewsData returned unreadable JSON', retryable: true },
    }
  }

  if (data.status !== 'success') {
    console.error('[newsdata] API error for query "%s": %o', query, data)
    return {
      articles: [],
      nextPage: null,
      error: { code: 'api_error', message: `NewsData API status: ${data.status}`, retryable: false },
    }
  }

  return {
    articles: (data.results ?? []).filter(a => !a.duplicate && !isFinancialSpam(a)),
    nextPage: data.nextPage ?? null,
  }
}
