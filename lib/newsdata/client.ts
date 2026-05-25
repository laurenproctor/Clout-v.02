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
}

export interface SearchResult {
  articles: NewsdataArticle[]
  nextPage: string | null
}

export async function searchLatest(
  query: string,
  opts: SearchOpts = {}
): Promise<SearchResult> {
  const apiKey = process.env.NEWSDATA_API_KEY
  if (!apiKey) throw new Error('NEWSDATA_API_KEY is not set')

  const params = new URLSearchParams({
    apikey: apiKey,
    q: query,
    language: opts.language ?? 'en',
    prioritydomain: 'top',
  })
  if (opts.page) params.set('page', opts.page)

  const url = `${NEWSDATA_BASE}?${params.toString()}`

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    console.error('[newsdata] fetch error for query "%s":', query, err)
    return { articles: [], nextPage: null }
  }

  if (res.status === 429) {
    console.warn('[newsdata] rate limited on query "%s" — skipping', query)
    return { articles: [], nextPage: null }
  }

  if (!res.ok) {
    console.error('[newsdata] HTTP %d for query "%s"', res.status, query)
    return { articles: [], nextPage: null }
  }

  let data: NewsdataResponse
  try {
    data = await res.json()
  } catch {
    console.error('[newsdata] invalid JSON for query "%s"', query)
    return { articles: [], nextPage: null }
  }

  if (data.status !== 'success') {
    console.error('[newsdata] API error for query "%s": %o', query, data)
    return { articles: [], nextPage: null }
  }

  return {
    articles: (data.results ?? []).filter(a => !a.duplicate),
    nextPage: data.nextPage ?? null,
  }
}
