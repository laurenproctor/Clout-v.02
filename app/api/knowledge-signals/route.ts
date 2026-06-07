import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { DEMO_TOPICS } from '@/lib/knowledge/demo-data'
import {
  buildContextHash,
  isCacheFresh,
  hasEnoughContext,
  generateKnowledgeTopics,
  type KnowledgeSignalsCache,
  type WorkspaceContext,
} from '@/lib/knowledge/generate'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const [settingsResult, titlesResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workspace_feed_settings')
      .select('services, content_topics, brand_name, knowledge_signals_cache')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle(),
    supabase
      .from('outputs')
      .select('title')
      .eq('workspace_id', session.workspaceId)
      .in('status', ['published', 'approved'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const ws = settingsResult.data as {
    services: string[]
    content_topics: string[]
    brand_name: string | null
    knowledge_signals_cache: KnowledgeSignalsCache | null
  } | null

  if (!ws) {
    return NextResponse.json({ topics: DEMO_TOPICS })
  }

  const ctx: WorkspaceContext = {
    brand_name: ws.brand_name ?? '',
    services: ws.services ?? [],
    content_topics: ws.content_topics ?? [],
    recent_titles: (titlesResult.data ?? [])
      .map((r: { title: string | null }) => r.title ?? '')
      .filter(Boolean),
  }

  if (!hasEnoughContext(ctx)) {
    return NextResponse.json({ topics: DEMO_TOPICS })
  }

  const currentHash = buildContextHash(ctx)

  if (ws.knowledge_signals_cache && isCacheFresh(ws.knowledge_signals_cache, currentHash)) {
    return NextResponse.json({ topics: ws.knowledge_signals_cache.topics })
  }

  try {
    const cache = await generateKnowledgeTopics(ctx)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('workspace_feed_settings')
      .update({
        knowledge_signals_cache: cache,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', session.workspaceId)

    return NextResponse.json({ topics: cache.topics })
  } catch (err) {
    console.error('[knowledge-signals] generation failed:', err)
    const fallback = ws.knowledge_signals_cache?.topics ?? DEMO_TOPICS
    return NextResponse.json({ topics: fallback })
  }
}
