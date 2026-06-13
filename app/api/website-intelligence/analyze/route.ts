import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { analyzeUrlForOpportunities } from '@/lib/website-intelligence/analyze'
import type { WebsiteAnalysisResult } from '@/lib/website-intelligence/analyze'
import { readCache, mergeIntoCache, writeCache } from '../_cache'

// Blog-index discovery can fan out to many post analyses; allow headroom.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let website_url: string
  try {
    const body = await req.json()
    website_url = body.website_url
    if (!website_url || typeof website_url !== 'string') {
      return NextResponse.json({ error: 'website_url is required' }, { status: 400 })
    }
    new URL(website_url) // validate URL format
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()

  // Save URL — targeted upsert preserves all other settings
  await supabase
    .from('workspace_feed_settings')
    .upsert(
      { workspace_id: session.workspaceId, website_url, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' }
    )

  // Blog-aware: discovers and analyzes individual posts when the URL is a blog
  // index (or a site with a discoverable blog), falling back to single-page
  // analysis otherwise. This is what surfaces the user's own posts.
  let result: WebsiteAnalysisResult
  try {
    result = await analyzeUrlForOpportunities(website_url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[website-intelligence/analyze] crawl/analysis failed:', msg)

    let userMessage = 'Could not reach that URL — make sure it\'s publicly accessible and try again.'
    if (msg.includes('FETCH_BLOCKED') || msg.includes('403')) {
      userMessage = 'That site is blocking automated access. Try a specific page URL instead of the homepage.'
    } else if (msg.includes('FETCH_TIMEOUT') || msg.includes('JINA_TIMEOUT')) {
      userMessage = 'The site took too long to respond. Try again or use a different page URL.'
    } else if (msg.includes('JINA_FAILED') || msg.includes('FETCH_FAILED')) {
      userMessage = 'Could not retrieve that page. Make sure the URL is correct and publicly accessible.'
    } else if (msg.includes('ANALYSIS_PARSE_FAILED')) {
      userMessage = 'Analysis completed but the result was unreadable. Please try again.'
    }

    return NextResponse.json({ error: userMessage }, { status: 422 })
  }

  // Merge (don't overwrite): blog discovery is intentionally partial — capped
  // post count, a wall-clock budget that skips remaining posts, per-post
  // failures, and a single-page fallback when discovery finds nothing — so a
  // re-analysis often returns fewer posts than a prior run. Overwriting would
  // wipe previously-discovered blog posts. `preferNew` refreshes the pages this
  // run did re-crawl while preserving everything it didn't. Stable per-post ids
  // (see analyze.ts) keep this idempotent rather than duplicating posts.
  const existing = await readCache(supabase, session.workspaceId)
  const merged = mergeIntoCache(existing, result, { preferNew: true })
  await writeCache(supabase, session.workspaceId, merged)

  return NextResponse.json({
    configured: true,
    website_url,
    items: merged.items,
    gaps: merged.gaps,
    assets: merged.assets,
  })
}
