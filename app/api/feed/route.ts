import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { FeedTab, SignalCard } from '@/types/feed'

const VALID_TABS: FeedTab[] = ['news', 'services', 'concepts', 'competitors']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') as FeedTab | null

  if (!tab || !VALID_TABS.includes(tab)) {
    return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 })
  }

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

    // Build base query
    let query = supabase
      .from('signal_cards')
      .select('*')
      .eq('tab', tab)

    // Services tab: filter by user's service offerings
    if (tab === 'services' && userServices.length > 0) {
      query = query.in('matched_service', userServices)
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
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Apply dismissal filter and compute opportunity tiers
    const filtered = (cards ?? [])
      .filter((card) => !dismissedIds.includes(card.id))
      .map((card) => {
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

        return { ...card, opportunity_tier: tier, ranking_rationale: rationale }
      })
      .sort((a, b) => {
        // Sort by tier first, then by gdelt_score within tier
        if (a.opportunity_tier !== b.opportunity_tier) {
          return a.opportunity_tier - b.opportunity_tier
        }
        return (b.gdelt_score ?? 0) - (a.gdelt_score ?? 0)
      })

    return NextResponse.json({ cards: filtered })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
