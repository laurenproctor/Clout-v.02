import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { ingestWorkspaceTopics } from '@/lib/feed/ingest'
import { deriveRefreshOutcome } from '@/lib/feed/refresh-outcome'

// Ingestion runs synchronously so we can report a real outcome. Tune to the
// deployment tier — do not assume a generic 300s ceiling.
export const maxDuration = 60

// Manual refresh is bounded for fast, predictable feedback. Larger topic sets
// belong to scheduled/background ingestion.
// TODO(feed-refresh): add stampede protection — a `feed_refresh_runs` row
// (running|completed|failed, workspace_id, timestamps, summary) to coalesce
// concurrent manual refreshes across tabs/users. The client `refreshing` state
// only guards a single client.
const MAX_TOPICS_PER_MANUAL_REFRESH = 20

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: ws } = await supabase
    .from('workspace_feed_settings')
    .select('content_topics, services')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()

  const topics = ws?.content_topics ?? []
  const services = ws?.services ?? []

  if (topics.length === 0 && services.length === 0) {
    return NextResponse.json(
      { error: 'No topics or services configured. Add them in Signal Feed settings first.' },
      { status: 400 },
    )
  }

  try {
    const summary = await ingestWorkspaceTopics({
      workspaceId: session.workspaceId,
      topics,
      services,
      mode: 'manual',
      maxTopics: MAX_TOPICS_PER_MANUAL_REFRESH,
    })

    const outcome = deriveRefreshOutcome(summary)
    const topicsTruncated =
      topics.length > summary.topicsProcessed
        ? { processed: summary.topicsProcessed, total: topics.length }
        : undefined

    // HTTP 200 for any completed run — the request itself succeeded and the UI
    // needs the summary to message accurately. (errors[] carries client-safe
    // codes only; no raw provider messages.)
    return NextResponse.json({
      ok: true,
      status: 'completed' as const,
      outcome,
      topicsProcessed: summary.topicsProcessed,
      topicsSucceeded: summary.topicsSucceeded,
      topicsFailed: summary.topicsFailed,
      articlesReturned: summary.articlesReturned,
      articlesAccepted: summary.articlesAccepted,
      newCards: summary.newCards,
      existingCardsRefreshed: summary.existingCardsRefreshed,
      durationMs: summary.durationMs,
      provider: summary.provider,
      errors: summary.errors,
      ...(topicsTruncated ? { topicsTruncated } : {}),
    })
  } catch (err) {
    // Route/system-level failure only (ingest itself threw). Provider problems
    // are reported as a completed run with errors[], not a 500.
    console.error('[feed/refresh] ingestion failed:', err)
    return NextResponse.json(
      { ok: false, status: 'failed' as const, message: 'Refresh failed. Try again shortly.' },
      { status: 500 },
    )
  }
}
