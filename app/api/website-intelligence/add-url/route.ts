import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { analyzeUrlForOpportunities } from '@/lib/website-intelligence/analyze'
import { mergeIntoCache, readCache, writeCache } from '../_cache'

// Blog-index discovery can fan out to many post analyses; allow headroom.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let url: string
  try {
    const body = await req.json()
    url = body.url
    if (!url || typeof url !== 'string') throw new Error('missing url')
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'A valid URL is required' }, { status: 400 })
  }

  const supabase = await createClient()

  let newResult
  try {
    newResult = await analyzeUrlForOpportunities(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[add-url] analysis failed:', msg)

    let userMessage = 'Could not reach that URL — make sure it\'s publicly accessible.'
    if (msg.includes('FETCH_BLOCKED') || msg.includes('403')) {
      userMessage = 'That page is blocking automated access. Try a different URL.'
    } else if (msg.includes('FETCH_UNREACHABLE')) {
      userMessage = 'That site\'s server didn\'t respond — it may be down or not serving that address.'
    } else if (msg.includes('FETCH_TIMEOUT') || msg.includes('JINA_TIMEOUT')) {
      userMessage = 'That page took too long to respond. Try again.'
    } else if (msg.includes('JINA_FAILED') || msg.includes('FETCH_FAILED')) {
      userMessage = 'Could not retrieve that page. Make sure the URL is correct and publicly accessible.'
    } else if (msg.includes('ANALYSIS_PARSE_FAILED')) {
      userMessage = 'Analysis completed but the result was unreadable. Please try again.'
    }
    return NextResponse.json({ error: userMessage }, { status: 422 })
  }

  const existing = await readCache(supabase, session.workspaceId)
  const merged = mergeIntoCache(existing, newResult)
  await writeCache(supabase, session.workspaceId, merged)

  const websiteUrl = await getWebsiteUrl(supabase, session.workspaceId)

  return NextResponse.json({
    configured: true,
    website_url: websiteUrl,
    items: merged.items,
    gaps: merged.gaps,
    assets: merged.assets,
  })
}

async function getWebsiteUrl(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, workspaceId: string) {
  const { data } = await supabase
    .from('workspace_feed_settings')
    .select('website_url')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return data?.website_url ?? null
}
