import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { searchLatest } from '@/lib/newsdata/client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // 1. What does workspace_feed_settings hold?
  const { data: ws } = await supabase
    .from('workspace_feed_settings')
    .select('content_topics, services')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()

  const topics = ws?.content_topics ?? []
  const services = ws?.services ?? []
  const lowerTopics = topics.map((t: string) => t.toLowerCase().trim())

  // 2. How many signal_cards exist for tab=news?
  const { count: totalNewsCards } = await supabase
    .from('signal_cards')
    .select('*', { count: 'exact', head: true })
    .eq('tab', 'news')

  // 3. How many cards would the overlaps filter return?
  let matchingCards = 0
  let sampleTags: string[][] = []
  if (lowerTopics.length > 0) {
    const { data: matched, count } = await supabase
      .from('signal_cards')
      .select('tags', { count: 'exact' })
      .eq('tab', 'news')
      .overlaps('tags', lowerTopics)
      .limit(5)
    matchingCards = count ?? 0
    sampleTags = (matched ?? []).map((c: { tags: string[] | null }) => c.tags ?? [])
  }

  // 4. Dismissed signal IDs for this user
  const { data: dismissedRows } = await supabase
    .from('user_signal_interactions')
    .select('signal_card_id')
    .eq('user_id', session.userId)
    .eq('interaction_type', 'dismissed')

  const dismissedIds = (dismissedRows ?? [])
    .map((r: { signal_card_id: string | null }) => r.signal_card_id)
    .filter((id): id is string => id !== null)

  // 5. Simulate the actual feed query: matching cards minus dismissed
  let afterDismissal = 0
  if (lowerTopics.length > 0 && matchingCards > 0) {
    const { data: matchedIds } = await supabase
      .from('signal_cards')
      .select('id')
      .eq('tab', 'news')
      .overlaps('tags', lowerTopics)

    const remaining = (matchedIds ?? []).filter(
      (c: { id: string }) => !dismissedIds.includes(c.id)
    )
    afterDismissal = remaining.length
  }

  // 6. Sample of tags actually stored (to check format)
  const { data: recentCards } = await supabase
    .from('signal_cards')
    .select('title, tags, created_at')
    .eq('tab', 'news')
    .order('created_at', { ascending: false })
    .limit(3)

  // 7. Quick newsdata probe — one topic, no insert
  let newsdataProbe: { query: string; articleCount: number; error?: string } | null = null
  if (topics.length > 0) {
    try {
      const { articles } = await searchLatest(topics[0])
      newsdataProbe = { query: topics[0], articleCount: articles.length }
    } catch (err) {
      newsdataProbe = { query: topics[0], articleCount: 0, error: String(err) }
    }
  }

  return NextResponse.json({
    workspaceId: session.workspaceId,
    userId: session.userId,
    wsFeedSettingsFound: ws !== null,
    settings: { topics, services },
    lowerTopics,
    totalNewsCards,
    matchingCards,
    dismissedCount: dismissedIds.length,
    afterDismissal,
    sampleMatchedTags: sampleTags,
    recentCards: recentCards ?? [],
    newsdataProbe,
  })
}
