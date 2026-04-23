import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Fetch the page HTML (first 50KB to avoid huge pages)
  let html: string
  try {
    const resp = await fetch(parsed.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clout/1.0; brand-inference)' },
      signal: AbortSignal.timeout(8000),
    })
    const text = await resp.text()
    html = text.slice(0, 50000)
  } catch {
    return NextResponse.json({ error: 'Could not fetch the website. Please check the URL.' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analyze this website HTML and extract brand identity information. Return ONLY valid JSON matching exactly this structure:

{
  "brand_name": "string or null",
  "primary_color": "#hexcode",
  "secondary_color": "#hexcode",
  "accent_color": "#hexcode",
  "font_heading": "font name string",
  "font_body": "font name string",
  "tone_traits": ["trait1", "trait2"]
}

Rules:
- Colors must be valid hex codes (#RRGGBB)
- If you can't determine a color, default to: primary #1A1A1A, secondary #FFFFFF, accent #D4A574
- Font names should be common Google Fonts or system fonts
- tone_traits: pick 2-4 from: Bold, Authoritative, Warm, Playful, Professional, Intellectual, Conversational, Inspirational, Minimal, Luxury, Energetic, Calm
- Return ONLY the JSON object, no markdown, no explanation

Website URL: ${parsed.href}

HTML content:
${html}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const inferred = JSON.parse(jsonMatch[0])
    return NextResponse.json(inferred)
  } catch {
    return NextResponse.json({ error: 'Could not parse brand data from website' }, { status: 500 })
  }
}
