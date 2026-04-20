import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Clout/1.0 (link preview)' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ title: null, description: null, url })
    }

    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
    const title = (ogTitleMatch?.[1] ?? titleMatch?.[1] ?? '').trim().slice(0, 200) || null

    // Extract description
    const ogDescMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
    const metaDescMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
    const description = (ogDescMatch?.[1] ?? metaDescMatch?.[1] ?? '').trim().slice(0, 500) || null

    return NextResponse.json({ title, description, url })
  } catch {
    // Fetch failed (timeout, CORS, etc.) — return empty
    return NextResponse.json({ title: null, description: null, url })
  }
}
