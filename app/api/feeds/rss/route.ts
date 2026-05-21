import { NextRequest, NextResponse } from 'next/server'
import { verifyFeedToken } from '@/lib/publishing/feed-token'
import { listPublishedContent } from '@/lib/publishing/domain'
import { createServiceClient } from '@/lib/supabase/service'

// Public RSS 2.0 feed — authenticated by per-workspace HMAC token.
// Medium (and any RSS reader) polls this to discover newly published articles.
// Each item links to providerUrl (WordPress, Ghost, etc.) — Medium fetches that
// URL directly to import the content, preserving the canonical URL.

function rfc2822(iso: string): string {
  return new Date(iso).toUTCString()
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const workspaceId = searchParams.get('w')
  const token       = searchParams.get('t')

  if (!workspaceId || !token) {
    return new NextResponse('Missing workspace or token.', { status: 400 })
  }

  if (!verifyFeedToken(workspaceId, token)) {
    return new NextResponse('Invalid feed token.', { status: 401 })
  }

  // Fetch workspace name for channel title
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name, slug')
    .eq('id', workspaceId)
    .single()

  const workspaceName = (workspace?.name as string | null) ?? 'Clout'

  // Published articles with a live public URL (suitable for Medium import)
  const result = await listPublishedContent({ workspaceId, limit: 50 })
  if (!result.ok) {
    return new NextResponse('Feed unavailable.', { status: 503 })
  }

  const items = result.data.filter(
    item => item.status === 'published' && item.providerUrl && item.publishedAt,
  )

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.clout.io'
  const feedUrl  = `${appUrl}/api/feeds/rss?w=${workspaceId}&t=${token}`
  const lastBuild = items[0]?.publishedAt
    ? rfc2822(items[0].publishedAt)
    : rfc2822(new Date().toISOString())

  const itemsXml = items.map(item => {
    const title      = escapeXml(item.title ?? 'Untitled')
    const link       = escapeXml(item.providerUrl!)
    const pubDate    = rfc2822(item.publishedAt!)
    const guid       = escapeXml(item.providerUrl!)
    const desc       = item.slug ? escapeXml(item.slug) : ''

    return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      ${desc ? `<description>${desc}</description>` : ''}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(workspaceName)}</title>
    <link>${escapeXml(appUrl)}</link>
    <description>Published articles from ${escapeXml(workspaceName)} via Clout</description>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>Clout</generator>
${itemsXml}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Cache for 15 minutes — short enough for Medium's poller to pick up new posts promptly
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  })
}
