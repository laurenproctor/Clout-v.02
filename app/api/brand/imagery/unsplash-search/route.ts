import { NextRequest, NextResponse } from 'next/server'

const STYLE_QUERY_MAP: Record<string, string> = {
  'Editorial':      'editorial photography',
  'Luxury':         'luxury lifestyle premium',
  'Minimalist':     'minimalist clean simple',
  'Bold Graphic':   'bold graphic vibrant',
  'Startup Modern': 'modern office workspace',
  'Technical':      'technology abstract data',
  'Futuristic':     'futuristic tech neon',
  'Abstract':       'abstract art geometric',
  'Warm Human':     'people lifestyle candid',
}

const MOOD_QUERY_MAP: Record<string, string> = {
  'Serious':      'professional formal',
  'Bold':         'dramatic bold contrast',
  'Premium':      'luxury elegant upscale',
  'Calm':         'serene peaceful calm',
  'Energetic':    'dynamic action movement',
  'Intellectual': 'thoughtful minimal book',
}

function buildQuery(visualStyles: string[], imageryTypes: string[], moodTraits: string[]): string {
  const terms: string[] = []

  for (const s of visualStyles) {
    terms.push(STYLE_QUERY_MAP[s] ?? s.toLowerCase())
  }
  for (const t of imageryTypes) {
    terms.push(t.toLowerCase())
  }
  for (const m of moodTraits) {
    if (MOOD_QUERY_MAP[m]) terms.push(MOOD_QUERY_MAP[m])
  }

  // Use first 3 terms to keep the query focused
  return terms.slice(0, 3).join(' ').trim()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const visualStyles = searchParams.getAll('visualStyles')
  const imageryTypes = searchParams.getAll('imageryTypes')
  const moodTraits   = searchParams.getAll('moodTraits')
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage      = page === 1 ? 12 : 10

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    return NextResponse.json({ images: [], fallback: true, hasMore: false })
  }

  const query = buildQuery(visualStyles, imageryTypes, moodTraits)
  if (!query) {
    return NextResponse.json({ images: [], fallback: true, hasMore: false })
  }

  try {
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', String(perPage))
    url.searchParams.set('page', String(page))
    url.searchParams.set('orientation', 'squarish')
    url.searchParams.set('content_filter', 'high')

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 3600 },
    })

    if (!resp.ok) {
      return NextResponse.json({ images: [], fallback: true, hasMore: false })
    }

    const data = await resp.json()

    const images = (data.results ?? []).map((photo: {
      id: string
      urls: { raw: string; thumb: string }
      alt_description?: string
      description?: string
    }) => ({
      id: photo.id,
      url: `${photo.urls.raw}&w=400&q=80&fit=crop&auto=format`,
      thumbUrl: photo.urls.thumb,
      label: photo.alt_description ?? photo.description ?? 'Photo',
    }))

    const hasMore = images.length === perPage

    return NextResponse.json({ images, query, hasMore, page })
  } catch {
    return NextResponse.json({ images: [], fallback: true, hasMore: false })
  }
}
