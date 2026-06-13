// Queue-first execution layer. The API route enqueues and then calls
// processPublishAttempt() synchronously for v1. Trigger.dev workers call
// executePublishingJob() for async/scheduled work in v2.
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getConnectionWithToken,
  transitionPublishedContent,
  recordConnectionSuccess,
  recordConnectionFailure,
} from './domain'
import { getProvider } from './registry'
import { findExistingPublish } from './idempotency'
import { shouldRetry, nextRetryAt } from './retries'
import type { CanonicalArticle } from './canonical/types'
import type { PublishOptions, PublishedContent } from './types'

export interface ProcessPublishParams {
  workspaceId: string
  publishedContentId: string
  connectionId: string
  article: CanonicalArticle
  opts: PublishOptions
  idempotencyKey: string
}

export async function processPublishAttempt(
  params: ProcessPublishParams,
): Promise<{ ok: boolean; providerUrl?: string; providerContentId?: string; error?: string; code?: string; publishAttemptId: string }> {
  const { workspaceId, publishedContentId, connectionId, article, opts, idempotencyKey } = params

  // Generate a correlation ID for this attempt — thread through all logs and events
  // so retries, workers, and repair jobs are debuggable without a full observability stack.
  // TODO: structured logging — log attempt start with attemptId, publishedContentId, provider, connectionId
  // TODO: publishing_events — record transition causality (state alone loses why retries occurred)
  const attemptId = createHash('sha256')
    .update(`${publishedContentId}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16)

  // ── Stage 1: Pre-publish lock ─────────────────────────────────────────────
  // Guard against duplicate publishes (especially critical for create-only providers
  // like Medium where a retry creates a new post with no delete API).
  const existing = await findExistingPublish(idempotencyKey)
  if (existing?.status === 'published') {
    console.log(JSON.stringify({
      event:             'publish.idempotency_hit',
      publishedContentId,
      idempotencyKey,
      existingUrl:       existing.providerUrl,
    }))
    return {
      ok:                true,
      providerUrl:       existing.providerUrl ?? undefined,
      providerContentId: existing.providerContentId ?? undefined,
      publishAttemptId:  attemptId,
    }
  }

  if (existing?.status === 'processing') {
    const ageMinutes = (Date.now() - new Date(existing.createdAt).getTime()) / 60_000
    if (ageMinutes < 5) {
      console.log(JSON.stringify({ event: 'publish.in_progress', publishedContentId, idempotencyKey, ageMinutes }))
      return { ok: false, error: 'Publish already in progress. Try again in a few minutes.', publishAttemptId: attemptId }
    }
    // Stuck job — treat as recoverable; proceed to attempt
    console.log(JSON.stringify({ event: 'publish.stuck_job_recovery', publishedContentId, idempotencyKey, ageMinutes }))
  }

  // Transition to processing
  await transitionPublishedContent(publishedContentId, 'processing')

  const connResult = await getConnectionWithToken(connectionId, workspaceId)
  if (!connResult.ok) {
    await transitionPublishedContent(publishedContentId, 'failed', { errorMessage: connResult.error })
    // TODO: publishing_events — record connection lookup failure
    return { ok: false, error: connResult.error, publishAttemptId: attemptId }
  }

  const connection = connResult.data

  // ── Account-level circuit breaker ─────────────────────────────────────────
  // Pause connections that have repeatedly failed with provider outages.
  // Prevents thundering-herd retries during platform-wide incidents.
  if (
    connection.consecutiveFailureCount >= 5 &&
    connection.lastErrorMessage?.includes('provider_outage')
  ) {
    const lastFailed = connection.lastFailedPublishAt
      ? new Date(connection.lastFailedPublishAt).getTime()
      : 0
    const pausedUntil = lastFailed + 15 * 60 * 1000
    if (Date.now() < pausedUntil) {
      const resumesInMin = Math.ceil((pausedUntil - Date.now()) / 60_000)
      console.log(JSON.stringify({
        event:             'publish.circuit_breaker_open',
        publishedContentId,
        connectionId,
        consecutiveFailures: connection.consecutiveFailureCount,
        resumesInMin,
      }))
      await transitionPublishedContent(publishedContentId, 'failed', {
        errorMessage: `Provider paused during outage recovery. Retry in ~${resumesInMin} min.`,
      })
      return { ok: false, error: `Provider paused during outage recovery. Retry in ~${resumesInMin} min.`, publishAttemptId: attemptId }
    }
  }

  const provider = getProvider(connection.provider)
  // TODO: structured logging — log provider timing start
  let result: Awaited<ReturnType<typeof provider.publish>>
  try {
    result = await provider.publish(connection, article, opts, idempotencyKey)
  } catch (err) {
    // ── Stage 5: Reconciliation path (ambiguous failure) ────────────────────
    // Network timeout after HTTP request was dispatched — provider may or may not
    // have received the request. For create-only providers (Medium) this is especially
    // dangerous: a retry could create a duplicate post with no way to delete it.
    const isTimeout = err instanceof Error && (
      err.message.includes('timeout') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('fetch failed')
    )
    const ambiguousError = isTimeout
      ? `Network timeout — ${connection.provider} may or may not have received the publish request. Verify on the platform before retrying.`
      : (err instanceof Error ? err.message : 'Unknown error during publish')

    console.log(JSON.stringify({
      event:             'publish.ambiguous_failure',
      publishedContentId,
      idempotencyKey,
      connectionId,
      provider:          connection.provider,
      isTimeout,
      error:             ambiguousError,
    }))

    await transitionPublishedContent(publishedContentId, 'failed', { errorMessage: ambiguousError })
    await recordConnectionFailure(connectionId, ambiguousError)
    return { ok: false, error: ambiguousError, publishAttemptId: attemptId }
  }
  // TODO: structured logging — log provider timing end + result status

  if (result.ok) {
    await transitionPublishedContent(publishedContentId, 'published', {
      providerContentId: result.providerContentId,
      providerUrl:       result.providerUrl,
      publishedAt:       result.publishedAt,
    })
    // TODO: publishing_events — record successful publish with providerContentId + formatter version
    await recordConnectionSuccess(connectionId)
    return { ok: true, providerUrl: result.providerUrl, providerContentId: result.providerContentId, publishAttemptId: attemptId }
  }

  // Failed — decide whether to retry
  await recordConnectionFailure(connectionId, result.error)

  const retryErr = Object.assign(new Error(result.error), { retryable: result.retryable })
  if (shouldRetry(0, retryErr)) {
    await transitionPublishedContent(publishedContentId, 'retrying', { errorMessage: result.error })
    // TODO: publishing_events — record retry classification + next retry delay
    // Future: enqueue retry job with nextRetryAt(0)
  } else {
    await transitionPublishedContent(publishedContentId, 'failed', { errorMessage: result.error })
    // TODO: publishing_events — record permanent failure + error code
  }

  // Pass through the provider's fail-closed code (e.g. ManualFallbackReason) so callers
  // like the Substack bridge can distinguish "show manual fallback" from a hard failure.
  return { ok: false, error: result.error, code: result.code, publishAttemptId: attemptId }
}

// Called by Trigger.dev worker for async/scheduled jobs.
export async function executePublishingJob(jobId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { data: job } = await supabase
    .from('publishing_jobs')
    .select()
    .eq('id', jobId)
    .single()

  if (!job) throw new Error(`Publishing job ${jobId} not found`)

  // Mark as processing (atomic guard against concurrent workers)
  const { data: locked } = await supabase
    .from('publishing_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'queued')
    .select('id')
    .single()

  if (!locked) return // Another worker claimed it

  const article = job.payload['article'] as CanonicalArticle
  const opts    = job.payload['opts']    as PublishOptions

  const result = await processPublishAttempt({
    workspaceId:        job.workspace_id as string,
    publishedContentId: job.published_content_id as string,
    connectionId:       job.connection_id as string,
    idempotencyKey:     job.idempotency_key as string,
    article,
    opts,
  })

  const newStatus    = result.ok ? 'completed' : 'failed'
  const newAttemptCount = (job.attempt_count as number) + 1

  await supabase
    .from('publishing_jobs')
    .update({
      status:        newStatus,
      attempt_count: newAttemptCount,
      error_message: result.ok ? null : result.error,
      ...(
        !result.ok && shouldRetry(newAttemptCount, new Error(result.error ?? ''))
          ? { status: 'retrying', next_retry_at: nextRetryAt(newAttemptCount).toISOString() }
          : {}
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

// Re-export for convenience in API routes
export type { PublishedContent }
