import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { CompetitorCard } from '@/types/feed'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Fetch workspace competitor entities
    const { data: competitorEntities, error: entityError } = await supabase
      .from('competitor_entities')
      .select('*')
      .eq('workspace_id', session.workspaceId)

    if (entityError) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!competitorEntities || competitorEntities.length === 0) {
      return NextResponse.json({ competitors: [] })
    }

    const competitorIds = competitorEntities.map((e: { id: string }) => e.id)

    // Fetch competitor signal cards
    const { data: cards, error: cardsError } = await supabase
      .from('signal_cards')
      .select('*')
      .eq('tab', 'competitors')
      .in('competitor_id', competitorIds)
      .order('gdelt_score', { ascending: false, nullsFirst: false })

    if (cardsError) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Fetch latest competitor mentions for differentiated angles
    const { data: mentions } = await supabase
      .from('competitor_mentions')
      .select('competitor_id, headline, angle_summary, has_coverage, published_at')
      .in('competitor_id', competitorIds)
      .order('published_at', { ascending: false })

    // Build mention index by competitor_id (latest mention per competitor)
    const mentionByCompetitor = new Map<string, { headline: string; angle_summary: string | null; has_coverage: boolean; published_at: string | null }>()
    for (const m of mentions ?? []) {
      if (!mentionByCompetitor.has(m.competitor_id)) {
        mentionByCompetitor.set(m.competitor_id, m)
      }
    }

    const competitors: CompetitorCard[] = (cards ?? []).map((card: {
      id: string
      competitor_id: string | null
      title: string
      created_at: string
      momentum_pct: string | null
      momentum_bar_width: number | null
    }) => {
      const entity = competitorEntities.find((e: { id: string }) => e.id === card.competitor_id)
      const mention = card.competitor_id ? mentionByCompetitor.get(card.competitor_id) : undefined

      return {
        id: card.id,
        competitor_name: entity?.name ?? 'Unknown',
        competitor_handle: entity?.handle ?? '',
        headline: mention?.headline ?? card.title,
        date: mention?.published_at ?? card.created_at,
        has_coverage: mention?.has_coverage ?? false,
        momentum_text: card.momentum_pct ?? '',
        momentum_flat: (card.momentum_bar_width ?? 0) < 5,
        differentiated_angle: mention?.angle_summary ?? '',
      } satisfies CompetitorCard
    })

    return NextResponse.json({ competitors })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
