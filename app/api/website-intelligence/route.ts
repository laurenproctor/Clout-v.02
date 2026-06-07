import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ws } = await (supabase as any)
    .from('workspace_feed_settings')
    .select('website_url, website_feed_cache')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle() as { data: { website_url: string | null; website_feed_cache: unknown } | null }

  const websiteUrl = ws?.website_url ?? null

  if (!websiteUrl) {
    return NextResponse.json({
      configured: false,
      items: [],
      gaps: [],
      assets: [],
      last_analyzed_at: null,
      website_url: null,
    })
  }

  const cache = ws?.website_feed_cache as {
    items?: object[]
    gaps?: object[]
    assets?: object[]
    analyzed_at?: string
  } | null

  return NextResponse.json({
    configured: true,
    items: cache?.items ?? [],
    gaps: cache?.gaps ?? [],
    assets: cache?.assets ?? [],
    last_analyzed_at: cache?.analyzed_at ?? null,
    website_url: websiteUrl,
  })
}
