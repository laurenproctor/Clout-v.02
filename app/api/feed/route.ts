import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { SignalCard } from '@/types/feed'

const VALID_TABS = ['news', 'concepts', 'competitors'] as const
type FeedOnlyTab = typeof VALID_TABS[number]

// Affinity weights per interaction type
const INTERACTION_WEIGHTS: Record<string, number> = {
  dismissed:     -1,
  card_expanded: 0.25,
  source_opened: 0.5,
  draft_started: 1,
  draft_edited:  2,
  draft_copied:  3,
  published:     5,
}

// Recency multiplier buckets (in days)
function recencyMultiplier(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000
  if (ageDays <= 7)  return 1.0
  if (ageDays <= 30) return 0.75
  if (ageDays <= 90) return 0.5
  return 0.25
}

interface FeedPreferences {
  preferred_topics?: string[]
  avoided_topics?: string[]
  coverage_gaps?: string[]
}

function computeTagAffinity(
  interactions: Array<{ signal_card_id: string | null; interaction_type: string; created_at: string | null }>,
  cardTagMap: Map<string, string[]>,
): Map<string, number> {
  const tagAffinity = new Map<string, number>()
  for (const row of interactions) {
    if (!row.signal_card_id || !row.created_at) continue
    const weight = INTERACTION_WEIGHTS[row.interaction_type]
    if (weight === undefined) continue
    const tags = cardTagMap.get(row.signal_card_id) ?? []
    const effective = weight * recencyMultiplier(row.created_at)
    for (const tag of tags) {
      tagAffinity.set(tag, (tagAffinity.get(tag) ?? 0) + effective)
    }
  }
  return tagAffinity
}

function cardAffinityScore(tags: string[], tagAffinity: Map<string, number>): number {
  return tags.reduce((sum, tag) => sum + (tagAffinity.get(tag) ?? 0), 0)
}

function headlineMatchScore(title: string, preferredTopics: string[]): number {
  const lower = title.toLowerCase()
  return preferredTopics.filter(t => lower.includes(t.toLowerCase())).length
}

function hasCoverageGap(title: string, tags: string[], coverageGaps: string[]): boolean {
  const lower = title.toLowerCase()
  return coverageGaps.some(g => {
    const gl = g.toLowerCase()
    return lower.includes(gl) || tags.some(t => t.toLowerCase().includes(gl))
  })
}

function isAvoidedCard(
  title: string,
  tags: string[],
  avoidedTagSet: Set<string>,
  avoidedTopics: string[],
): boolean {
  // Both conditions must hold to avoid false positives from noisy signals
  const allTagsAvoided = tags.length > 0 && tags.every(t => avoidedTagSet.has(t))
  const headlineAvoided = avoidedTopics.some(at => title.toLowerCase().includes(at.toLowerCase()))
  return allTagsAvoided && headlineAvoided
}

const MAX_PER_CLUSTER = 3

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

    // Fetch workspace feed settings (includes intelligence profile)
    const { data: wsFeedSettings } = await supabase
      .from('workspace_feed_settings')
      .select('services, content_topics, feed_preferences, derived_topics')
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

    const feedPrefs = (wsFeedSettings?.feed_preferences ?? null) as FeedPreferences | null

    // Dismissed signals to exclude from this session
    const { data: dismissedRows } = await supabase
      .from('user_signal_interactions')
      .select('signal_card_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'dismissed')

    const dismissedIds = (dismissedRows ?? [])
      .map((r: { signal_card_id: string | null }) => r.signal_card_id)
      .filter((id): id is string => id !== null)

    // Load recent interactions for time-decayed affinity scoring
    const { data: interactionRows } = await supabase
      .from('user_signal_interactions')
      .select('signal_card_id, interaction_type, created_at')
      .eq('user_id', userId)
      .in('interaction_type', Object.keys(INTERACTION_WEIGHTS))
      .order('created_at', { ascending: false })
      .limit(200)

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

    // Build card → tags map for affinity scoring (uses already-fetched cards)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardTagMap = new Map<string, string[]>((cards ?? []).map((c: any) => [c.id as string, (c.tags ?? []) as string[]]))

    // Compute time-decayed tag affinity from recent interactions
    const tagAffinity = computeTagAffinity(interactionRows ?? [], cardTagMap)

    // Tags with net score ≤ -3 are candidates for filtering
    const avoidedTagSet = new Set<string>()
    for (const [tag, score] of tagAffinity) {
      if (score <= -3) avoidedTagSet.add(tag)
    }

    // Preference profile data
    const preferredTopics = feedPrefs?.preferred_topics ?? []
    const avoidedTopics = feedPrefs?.avoided_topics ?? []
    const coverageGaps = feedPrefs?.coverage_gaps ?? []

    // Apply dismissal filter, compute tiers + composite scoring
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = (cards ?? [])
      .filter((card) => !dismissedIds.includes(card.id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((rawCard: any) => {
        // Flatten signals join → source_url + published_at
        const sig = rawCard.signals as { source_url?: string | null; published_at?: string | null } | null
        const { signals: _sig, ...card } = rawCard as typeof rawCard & { signals?: unknown }

        const tags: string[] = card.tags ?? []
        const title: string = card.title ?? ''

        // Exclude cards where all tags are avoided AND headline matches an avoided topic
        if (isAvoidedCard(title, tags, avoidedTagSet, avoidedTopics)) return null

        const isNicheMatch =
          tags.some((t: string) => userTopics.includes(t)) ||
          (card.matched_service !== null && userServices.includes(card.matched_service))

        const velocity = card.momentum_bar_width ?? 0
        const hasCompetitorCoverage = competitorCoveredIds.has(card.id)

        // Base opportunity tiers
        let tier: 1 | 2 | 3
        if (isNicheMatch && !hasCompetitorCoverage && velocity >= 50) {
          tier = 1
        } else if (isNicheMatch || velocity >= 20) {
          tier = 2
        } else {
          tier = 3
        }

        // Intelligence scoring
        const affinityScore = cardAffinityScore(tags, tagAffinity)
        const matchScore = headlineMatchScore(title, preferredTopics)
        const gapMatch = hasCoverageGap(title, tags, coverageGaps)

        // Coverage gap: promote tier by 1 (floor 1)
        let adjustedTier = tier
        if (gapMatch && adjustedTier > 1) adjustedTier = (adjustedTier - 1) as 1 | 2 | 3

        const compositeScore = affinityScore + matchScore

        // Ranking rationale
        const rationale: string[] = []
        if (adjustedTier === 1 && tier === 1) rationale.push('Tier 1 opportunity')
        if (velocity >= 50) rationale.push('High velocity')
        else if (velocity >= 20) rationale.push('Rising momentum')
        if (!hasCompetitorCoverage && (tab === 'news' || tab === 'concepts')) {
          rationale.push('Unclaimed in your niche')
        }
        if (card.timing_classification === 'publish_now') rationale.push('Time-sensitive')
        if (affinityScore > 2) rationale.push("Matches topics you've drafted from")
        if (matchScore > 0 && affinityScore <= 2) rationale.push('Aligns with topics you engage with')
        if (gapMatch) rationale.push('New angle — outside your usual coverage')

        return {
          ...card,
          source_url: sig?.source_url ?? null,
          published_at: sig?.published_at ?? null,
          opportunity_tier: adjustedTier,
          ranking_rationale: [...new Set(rationale)],
          _compositeScore: compositeScore,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        if (a.opportunity_tier !== b.opportunity_tier) {
          return a.opportunity_tier - b.opportunity_tier
        }
        if (b._compositeScore !== a._compositeScore) {
          return b._compositeScore - a._compositeScore
        }
        return (b.gdelt_score ?? 0) - (a.gdelt_score ?? 0)
      })

    // Topic saturation cap: max MAX_PER_CLUSTER cards per primary tag cluster
    const clusterCounts = new Map<string, number>()
    const diversified = scored
      .filter(card => {
        const primaryTag = (card.tags as string[])?.[0] ?? 'uncategorized'
        const count = clusterCounts.get(primaryTag) ?? 0
        if (count >= MAX_PER_CLUSTER) return false
        clusterCounts.set(primaryTag, count + 1)
        return true
      })
      .map(({ _compositeScore: _s, ...rest }) => rest as SignalCard & {
        source_url: string | null
        published_at: string | null
        opportunity_tier: 1 | 2 | 3
        ranking_rationale: string[]
      })

    console.log('[feed] tab=%s finalCards=%d', tab, diversified.length)
    return NextResponse.json({ cards: diversified })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
