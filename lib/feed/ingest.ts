import { createServiceClient } from '@/lib/supabase/service'
import { searchLatest, type ProviderErrorCode } from '@/lib/newsdata/client'
import { articleToSignalInsert, signalToCardInsert } from '@/lib/newsdata/mapper'

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export type IngestMode = 'manual' | 'scheduled'

export interface WorkspaceIngestParams {
  topics: string[]
  services?: string[]
  /** For server-side logging / future run tracking. */
  workspaceId?: string
  /** Manual refresh optimizes for fast, bounded feedback; scheduled for coverage. */
  mode?: IngestMode
  /** Bound on topics processed in one run (applied for manual refreshes). */
  maxTopics?: number
}

// Client-safe — deliberately omits the raw provider `message` (logged separately).
export interface FeedIngestError {
  topic?: string
  provider: 'newsdata'
  code: ProviderErrorCode
  retryable: boolean
  status?: number
}

export type ProviderRollupStatus = 'ok' | 'partial' | 'failed' | 'misconfigured' | 'rate_limited'

export interface FeedIngestSummary {
  topicsProcessed: number
  topicsSucceeded: number // searchLatest returned without error (even if 0 articles)
  topicsFailed: number
  articlesReturned: number // raw from provider, post dedupe/spam filter
  articlesAccepted: number // mapped into a signal (passed validation)
  newCards: number
  existingCardsRefreshed: number
  errors: FeedIngestError[]
  provider: { name: 'newsdata'; status: ProviderRollupStatus }
  durationMs: number
}

// Roll per-topic failures up into a single provider-wide status so a global
// problem (missing key, outage) doesn't read as N identical topic errors.
function rollupProviderStatus(
  topicsProcessed: number,
  topicsFailed: number,
  errors: FeedIngestError[],
): ProviderRollupStatus {
  if (topicsFailed === 0) return 'ok'
  if (topicsFailed < topicsProcessed) return 'partial'
  // Every processed topic failed — characterize by the dominant cause.
  if (errors.length > 0 && errors.every(e => e.code === 'missing_api_key')) return 'misconfigured'
  if (errors.length > 0 && errors.every(e => e.code === 'rate_limited')) return 'rate_limited'
  return 'failed'
}

export async function ingestWorkspaceTopics(
  params: WorkspaceIngestParams,
): Promise<FeedIngestSummary> {
  const { topics, workspaceId, maxTopics } = params
  const startedAt = Date.now()

  const summary: FeedIngestSummary = {
    topicsProcessed: 0,
    topicsSucceeded: 0,
    topicsFailed: 0,
    articlesReturned: 0,
    articlesAccepted: 0,
    newCards: 0,
    existingCardsRefreshed: 0,
    errors: [],
    provider: { name: 'newsdata', status: 'ok' },
    durationMs: 0,
  }

  if (topics.length === 0) {
    summary.durationMs = Date.now() - startedAt
    return summary
  }

  const supabase = createServiceClient()

  type QueueItem = { tab: 'news'; query: string }
  const boundedTopics = typeof maxTopics === 'number' ? topics.slice(0, maxTopics) : topics
  const queue: QueueItem[] = boundedTopics.map(t => ({ tab: 'news' as const, query: t }))

  for (const item of queue) {
    summary.topicsProcessed += 1
    try {
      await delay(300)
      const { articles, error } = await searchLatest(item.query, { titleOnly: item.tab === 'news' })

      if (error) {
        // Provider-level failure for this topic — record client-safe details and
        // log the raw message server-side only.
        console.error('[ingestWorkspaceTopics] topic failed', {
          workspaceId,
          topic: item.query,
          code: error.code,
          message: error.message,
          status: error.status,
        })
        summary.topicsFailed += 1
        summary.errors.push({
          topic: item.query,
          provider: 'newsdata',
          code: error.code,
          retryable: error.retryable,
          status: error.status,
        })
        // Don't fall through to the success counter for this topic.
        continue
      }

      summary.topicsSucceeded += 1

      for (const article of articles) {
        summary.articlesReturned += 1
        const signalInsert = articleToSignalInsert(article)

        const { data: existingSignal } = await supabase
          .from('signals')
          .select('id')
          .eq('external_id', signalInsert.external_id)
          .maybeSingle()

        let signalId: string
        if (existingSignal) {
          signalId = existingSignal.id
        } else {
          const { data: newSignal } = await supabase
            .from('signals')
            .insert({
              external_id: signalInsert.external_id,
              source: signalInsert.source,
              title: signalInsert.title,
              source_url: signalInsert.source_url,
              published_at: signalInsert.published_at,
              tone: signalInsert.tone,
              coverage_48h_pct: signalInsert.coverage_48h_pct,
              refreshed_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (!newSignal) continue
          signalId = newSignal.id
        }

        summary.articlesAccepted += 1

        const { data: existingCard } = await supabase
          .from('signal_cards')
          .select('id')
          .eq('signal_id', signalId)
          .eq('tab', item.tab)
          .maybeSingle()

        const cardInsert = signalToCardInsert(
          { ...signalInsert, id: signalId },
          item.tab,
          item.query,
          article.keywords,
        )

        if (existingCard) {
          await supabase
            .from('signal_cards')
            .update({ refreshed_at: new Date().toISOString(), ...cardInsert })
            .eq('id', existingCard.id)
          summary.existingCardsRefreshed += 1
        } else {
          await supabase
            .from('signal_cards')
            .insert({ signal_id: signalId, ...cardInsert })
          summary.newCards += 1
        }
      }
    } catch (err) {
      // Genuinely unexpected throw (DB error, etc.) — not a provider-reported
      // failure, so it has not already been counted above (we `continue` on those).
      console.error('[ingestWorkspaceTopics] unexpected error for query "%s":', item.query, err)
      summary.topicsFailed += 1
      summary.errors.push({
        topic: item.query,
        provider: 'newsdata',
        code: 'unexpected_error',
        retryable: true,
      })
    }
  }

  summary.provider.status = rollupProviderStatus(
    summary.topicsProcessed,
    summary.topicsFailed,
    summary.errors,
  )
  summary.durationMs = Date.now() - startedAt
  return summary
}
