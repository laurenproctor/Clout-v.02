import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { scrapeUrl } from '@/lib/scraper'
import { callClaude } from '@/lib/ai/generate'
import { isSafeUrl } from '@/lib/scraper/isSafeUrl'
import {
  buildArticleContext,
  buildSystemPrompt,
  buildUserPrompt,
} from '@/lib/draft/competitorIntelHelpers'
import type { DraftFormat, DraftTone } from '@/types/feed'

export const maxDuration = 60

const VALID_FORMATS: DraftFormat[] = ['linkedin', 'twitter', 'blog', 'newsletter', 'instagram']
const VALID_TONES: DraftTone[] = ['authoritative', 'conversational', 'provocative', 'educational']

interface RequestBody {
  item_id:           string
  item_url:          string
  item_title:        string
  item_summary:      string | null
  item_content:      string | null
  item_topics:       string[]
  competitor_domain: string
  format:            DraftFormat
  tone:              DraftTone
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    item_url,
    item_title,
    item_summary,
    item_content,
    item_topics,
    competitor_domain,
    format,
    tone,
  } = body

  if (!item_title || !competitor_domain || !format || !tone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  if (!VALID_TONES.includes(tone)) {
    return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })
  }

  // Fast path: use pre-existing content from the feed item.
  // Scrape only when no existing content is available and the URL is safe.
  const hasExistingContent = !!(item_content?.trim() || item_summary?.trim())
  let scraped: string | null = null

  if (!hasExistingContent && item_url && isSafeUrl(item_url)) {
    try {
      const article = await scrapeUrl(item_url)
      scraped = article.markdownContent ?? null
    } catch {
      // Silent fallback — article context will use title/topics
    }
  }

  const articleContext = buildArticleContext({
    scraped,
    item_content: item_content ?? null,
    item_summary: item_summary ?? null,
    item_title,
    item_topics: item_topics ?? [],
  })

  const supabase = await createClient()
  const [brandContext, feedSettingsResult] = await Promise.all([
    getBrandContext(),
    supabase
      .from('workspace_feed_settings')
      .select('content_topics, services, tone_preference')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
  ])

  const feedSettings = feedSettingsResult.data

  const systemPrompt = buildSystemPrompt({
    brandName:        brandContext.brandName,
    toneTraits:       brandContext.toneTraits,
    contentTopics:    feedSettings?.content_topics ?? [],
    services:         feedSettings?.services ?? [],
    competitorDomain: competitor_domain,
  })

  const userPrompt = buildUserPrompt({ articleContext, format, tone })

  try {
    const result = await callClaude({
      systemPrompt,
      userMessage: userPrompt,
      maxTokens:   600,
      temperature: 0.7,
    })

    return NextResponse.json({ draft: result.content })
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 502 })
  }
}
