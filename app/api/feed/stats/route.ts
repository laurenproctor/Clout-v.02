import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { FeedStats } from '@/types/feed'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fallback: FeedStats = {
    totalSignals: 0,
    domainsTracked: 0,
    emergingFrameworks: 0,
    lastRefreshed: null,
  }

  try {
    const supabase = await createClient()

    const [totalResult, allTagsResult, conceptsResult, refreshedResult] =
      await Promise.all([
        supabase.from('signal_cards').select('*', { count: 'exact', head: true }),
        // Fetch tags arrays to count distinct values in JS — avoids RPC type dependency
        supabase.from('signal_cards').select('tags'),
        supabase
          .from('signal_cards')
          .select('*', { count: 'exact', head: true })
          .eq('tab', 'concepts'),
        supabase
          .from('signal_cards')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

    const distinctTags = new Set<string>()
    for (const row of allTagsResult.data ?? []) {
      for (const tag of row.tags ?? []) {
        if (tag) distinctTags.add(tag)
      }
    }

    return NextResponse.json({
      totalSignals: totalResult.count ?? 0,
      domainsTracked: distinctTags.size,
      emergingFrameworks: conceptsResult.count ?? 0,
      lastRefreshed: refreshedResult.data?.created_at ?? null,
    } satisfies FeedStats)
  } catch {
    return NextResponse.json(fallback)
  }
}
