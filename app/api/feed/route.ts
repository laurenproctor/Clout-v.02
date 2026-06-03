import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { SignalCard } from '@/types/feed'

const VALID_TABS = ['news', 'concepts', 'competitors'] as const
type FeedOnlyTab = typeof VALID_TABS[number]

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawTab = searchParams.get('tab')

  if (!rawTab || !(VALID_TABS as readonly string[]).includes(rawTab)) {
    return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 })
  }
  const tab = rawTab as FeedOnlyTab

  try {
    const supabase = await createClient()
    const userId = session.userId
    const workspaceId = session.workspaceId

    // Fetch workspace feed settings for niche/services matching
    const { data: wsFeedSettings } = await supabase
      .from('workspace_feed_settings')
      .select('services, content_topics')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    // Fall back to user_profiles for workspaces without saved workspace-level settings
    let userServices: string[]
    let userTopics: string[]
    if (wsFeedSettings) {
      userServices = wsFeedSettings.services ?? []
      userTopics = wsFeedSettings.content_topics ?? []
    } else {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('services, content_topics')
        .eq('id', userId)
        .maybeSingle()
      userServices = profile?.services ?? []
      userTopics = profile?.content_topics ?? []
    }

    // Dismissed signals to exclude from this session
    const { data: dismissedRows } = await supabase
      .from('user_signal_interactions')
      .select('signal_card_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'dismissed')

    const dismissedIds = (dismissedRows ?? []).map((r: { signal_card_id: string | null }) => r.signal_card_id).filter((id): id is string => id !== null)

    // Competitor-covered signal IDs (for whitespace computation)
    const { data: workspaceCompetitors } = await supabase
      .from('competitor_entities')
      .select('id')
      .eq('workspace_id', workspaceId)

    const workspaceCompetitorIds = (workspaceCompetitors ?? []).map((e: { id: string }) => e.id)

    const { data: competitorMentions } = workspaceCompetitorIds.length > 0
      ? await supabase
          .from('competitor_mentions')
          .select('card_id')
          .in('competitor_id', workspaceCompetitorIds)
      : { data: [] }

    const competitorCoveredIds = new Set(
      (competitorMentions ?? [])
        .map((m: { card_id: string | null }) => m.card_id)
        .filter(Boolean) as string[]
    )

    // Build base query — join signals to pull source_url and published_at
    let query = supabase
      .from('signal_cards')
      .select('*, signals(source_url, published_at)')
      .eq('tab', tab)

    // News tab: filter to cards whose tags overlap the workspace's topics
    if (tab === 'news' && userTopics.length > 0) {
      const lowerTopics = userTopics.map(t => t.toLowerCase().trim())
      query = query.overlaps('tags', lowerTopics)
    }

    // Competitors tab: filter by competitor signal cards
    if (tab === 'competitors') {
      const { data: competitorEntities } = await supabase
        .from('competitor_entities')
        .select('id')
        .eq('workspace_id', workspaceId)

      const competitorEntityIds = (competitorEntities ?? []).map((e: { id: string }) => e.id)
      if (competitorEntityIds.length > 0) {
        query = query.in('competitor_id', competitorEntityIds)
      } else {
        return NextResponse.json({ cards: [] })
      }
    }

    const { data: cards, error } = await query

    if (error) {
      console.error('[feed] query error tab=%s workspace=%s:', tab, workspaceId, error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    console.log('[feed] tab=%s workspace=%s topics=%j rawCards=%d dismissedIds=%d wsFeedSettings=%s',
      tab, workspaceId, userTopics, (cards ?? []).length, dismissedIds.length, wsFeedSettings ? 'found' : 'missing')

    // Apply dismissal filter and compute opportunity tiers
    const filtered = (cards ?? [])
      .filter((card) => !dismissedIds.includes(card.id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((rawCard: any) => {
        // Flatten signals join → source_url + published_at
        const sig = rawCard.signals as { source_url?: string | null; published_at?: string | null } | null
        const { signals: _sig, ...card } = rawCard as typeof rawCard & { signals?: unknown }

        const isNicheMatch =
          (card.tags ?? []).some((t: string) => userTopics.includes(t)) ||
          (card.matched_service !== null && userServices.includes(card.matched_service))

        const velocity = card.momentum_bar_width ?? 0
        const hasCompetitorCoverage = competitorCoveredIds.has(card.id)

        // Phase 1 opportunity tiers
        let tier: 1 | 2 | 3
        if (isNicheMatch && !hasCompetitorCoverage && velocity >= 50) {
          tier = 1
        } else if (isNicheMatch || velocity >= 20) {
          tier = 2
        } else {
          tier = 3
        }

        // Human-readable ranking rationale
        const rationale: string[] = []
        if (tier === 1) rationale.push('Tier 1 opportunity')
        if (velocity >= 50) rationale.push('High velocity')
        else if (velocity >= 20) rationale.push('Rising momentum')
        if (!hasCompetitorCoverage && (tab === 'news' || tab === 'concepts')) {
          rationale.push('Unclaimed in your niche')
        }
        if (card.timing_classification === 'publish_now') rationale.push('Time-sensitive')

        return {
          ...card,
          source_url: sig?.source_url ?? null,
          published_at: sig?.published_at ?? null,
          opportunity_tier: tier,
          ranking_rationale: rationale,
        }
      })
      .sort((a, b) => {
        // Sort by tier first, then by gdelt_score within tier
        if (a.opportunity_tier !== b.opportunity_tier) {
          return a.opportunity_tier - b.opportunity_tier
        }
        return (b.gdelt_score ?? 0) - (a.gdelt_score ?? 0)
      })

    console.log('[feed] tab=%s finalCards=%d', tab, filtered.length)
    return NextResponse.json({ cards: filtered })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
