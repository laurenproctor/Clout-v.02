import { NextRequest, NextResponse } from 'next/server'

const STYLE_QUERY_MAP: Record<string, string> = {
  'Editorial':      'editorial photography',
  'Luxury':         'luxury lifestyle',
  'Minimalist':     'minimalist clean',
  'Bold Graphic':   'bold graphic vibrant',
  'Startup Modern': 'modern workspace',
  'Technical':      'technology abstract',
  'Futuristic':     'futuristic tech',
  'Abstract':       'abstract art',
  'Warm Human':     'people lifestyle candid',
}

const MOOD_QUERY_MAP: Record<string, string> = {
  'Serious':      'professional formal',
  'Bold':         'dramatic bold',
  'Premium':      'luxury upscale',
  'Calm':         'serene peaceful',
  'Energetic':    'dynamic action',
  'Intellectual': 'thoughtful minimal',
}

const TONE_QUERY_MAP: Record<string, string> = {
  'Bold':            'bold dramatic',
  'Authoritative':   'professional authority',
  'Warm':            'warm inviting',
  'Playful':         'colorful playful fun',
  'Professional':    'clean professional',
  'Intellectual':    'editorial minimal',
  'Conversational':  'lifestyle candid',
  'Inspirational':   'inspiring aspirational',
  'Minimal':         'minimal white space',
  'Luxury':          'luxury premium',
  'Energetic':       'vibrant dynamic',
  'Calm':            'calm serene neutral',
  'Edgy':            'edgy contrast dark',
  'Approachable':    'friendly warm natural',
}

const SCHEME_MAP: Record<string, string> = {
  'dark':  'dark moody dramatic',
  'light': 'bright airy clean',
}

// Strip common stop words and return meaningful terms from free text
function extractKeyTerms(text: string, max: number): string[] {
  const stop = new Set(['a','an','the','and','or','but','for','in','on','at','to','of','with','is','are','be','that','this','it','as','by','from','into'])
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w))
    .slice(0, max)
}

function buildQuery(
  visualStyles: string[],
  imageryTypes: string[],
  moodTraits: string[],
  toneTraits: string[],
  subjects: string[],
  generationNotes: string,
  colorScheme: string,
): string {
  const terms: string[] = []

  // Subjects are the most concrete signal — use them first
  subjects.slice(0, 2).forEach(s => terms.push(s.toLowerCase()))

  // Visual styles — include up to 2 so adding a second style actually changes the query
  visualStyles.slice(0, 2).forEach(style => {
    const mapped = STYLE_QUERY_MAP[style]
    terms.push(mapped ?? style.toLowerCase())
  })

  // Imagery type
  if (imageryTypes.length > 0) {
    terms.push(imageryTypes[0].toLowerCase())
  }

  // Mood — prefer explicit mood, fall back to tone
  if (moodTraits.length > 0) {
    const mapped = MOOD_QUERY_MAP[moodTraits[0]]
    if (mapped) terms.push(mapped)
  } else if (toneTraits.length > 0) {
    const mapped = TONE_QUERY_MAP[toneTraits[0]]
    if (mapped) terms.push(mapped)
  }

  // Secondary tone trait for flavour (if not already covered by mood)
  if (moodTraits.length > 0 && toneTraits.length > 0) {
    const mapped = TONE_QUERY_MAP[toneTraits[0]]
    if (mapped) terms.push(mapped)
  }

  // Color scheme
  if (colorScheme && SCHEME_MAP[colorScheme]) {
    terms.push(SCHEME_MAP[colorScheme])
  }

  // Generation notes — extract key descriptive terms
  if (generationNotes.trim()) {
    const noteTerms = extractKeyTerms(generationNotes, 2)
    terms.push(...noteTerms)
  }

  // Unsplash searches best with 3–5 focused terms
  return terms.slice(0, 5).join(' ').trim()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const visualStyles    = searchParams.getAll('visualStyles')
  const imageryTypes    = searchParams.getAll('imageryTypes')
  const moodTraits      = searchParams.getAll('moodTraits')
  const toneTraits      = searchParams.getAll('toneTraits')
  const subjects        = searchParams.getAll('subjects')
  const generationNotes = searchParams.get('generationNotes') ?? ''
  const colorScheme     = searchParams.get('colorScheme') ?? ''
  const page            = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage         = page === 1 ? 12 : 10

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    return NextResponse.json({ images: [], fallback: true, hasMore: false })
  }

  const query = buildQuery(visualStyles, imageryTypes, moodTraits, toneTraits, subjects, generationNotes, colorScheme)
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
      next: { revalidate: 300 },
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

    const totalPages: number = data.total_pages ?? 0
    const hasMore = page < totalPages

    return NextResponse.json({ images, query, hasMore, page, totalPages })
  } catch {
    return NextResponse.json({ images: [], fallback: true, hasMore: false })
  }
}
