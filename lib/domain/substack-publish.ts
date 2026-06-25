// Substack publishing bridge. Connects an output (Clout's lifecycle artifact) to the
// publishing-layer executor (lib/publishing/*) WITHOUT creating a parallel Substack path.
// Routing into this bridge is decided by output.publishing_connection_id (see
// publishOutput() in lib/domain/publishing.ts) — never by content type alone.
import { getConnectionWithToken, createPublishedContentRecord } from '@/lib/publishing/domain'
import { computeContentHash, generateIdempotencyKey, findExistingPublish } from '@/lib/publishing/idempotency'
import { processPublishAttempt } from '@/lib/publishing/executor'
import { markdownToCanonicalBody } from '@/lib/publishing/canonical/from-blog'
import { isSubstackActionEnabled, FEATURES } from '@/lib/features'
import { recordSubstackAudit } from '@/lib/publishing/providers/substack/audit'
import { buildSubstackFallback } from '@/lib/publishing/providers/substack/fallback'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import type { PublishOptions, ManualFallbackReason, ManualFallbackResult } from '@/lib/publishing/types'
import type { Output, OutputContent, PublishIntent } from '@/types/domain'

// Thrown when a Substack output cannot be published directly and must fall back to the
// manual copy/open product state. Carries the concrete ManualFallbackResult so the UI can
// render a friendly, useful surface (never an error dead-end). The scheduler treats any
// throw from the bridge as a fail-safe (output marked failed), so intent is never silently
// downgraded — e.g. a "send email" is never quietly turned into a draft.
export class SubstackManualFallbackError extends Error {
  readonly fallback: ManualFallbackResult
  constructor(fallback: ManualFallbackResult) {
    super(fallback.fallback.message)
    this.name = 'SubstackManualFallbackError'
    this.fallback = fallback
  }
}

const MANUAL_FALLBACK_REASONS: ReadonlySet<string> = new Set<ManualFallbackReason>([
  'missing_connection',
  'capability_unverified',
  'direct_publish_disabled',
  'auth_failed',
  'missing_provider_url',
  'unexpected_response_shape',
])

function isManualFallbackReason(code: string | undefined): code is ManualFallbackReason {
  return code !== undefined && MANUAL_FALLBACK_REASONS.has(code)
}

function outputToCanonicalArticle(output: Output): CanonicalArticle {
  const content = output.content as OutputContent
  const body = (content.body as string | undefined) ?? ''
  const hook = (content as Record<string, unknown>).hook as string | undefined
  return {
    id:      output.id,
    title:   output.title ?? '',
    excerpt: hook,
    body:    markdownToCanonicalBody(body),
  }
}

// A draft intent maps to the verified draft path; every other intent is a direct action.
function publishOptionsFor(intent: PublishIntent, output: Output): PublishOptions {
  return {
    status:                 intent === 'substack_newsletter_draft' ? 'draft' : 'publish',
    substackIntendedAction: intent,
    overrideTitle:          output.title ?? undefined,
  }
}

/**
 * Publishes a Substack output through the publishing-layer executor. Returns the provider
 * post identifier + URL in the shape used by the other publish*Output helpers. Throws
 * SubstackManualFallbackError when the action is blocked or fails closed.
 */
export async function publishSubstackOutput(
  output: Output,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of public signature, reserved for retry handling
  _opts?: { wasRetry?: boolean },
): Promise<{ postUrn: string; postUrl: string }> {
  // Universal idempotency guard — never re-publish an output that already has a provider id.
  if (output.providerPostId) {
    return { postUrn: output.providerPostId, postUrl: output.providerPostUrl ?? output.providerPostId }
  }

  const connectionId = output.publishingConnectionId
  const workspaceId  = output.workspaceId ?? ''
  // Default to the verified draft action when no explicit intent was persisted. Never
  // upgrade to a direct/publish action implicitly.
  const intent: PublishIntent = output.publishIntent ?? 'substack_newsletter_draft'

  const auditBase = {
    workspaceId,
    outputId:               output.id,
    publishingConnectionId: connectionId,
    intendedAction:         intent,
  }

  // Destination is required. Content type alone must never reach a publish.
  if (!connectionId) {
    recordSubstackAudit('substack_manual_fallback_opened', { ...auditBase, publishingConnectionId: null, status: 'manual_fallback', reason: 'missing_connection' })
    throw new SubstackManualFallbackError(buildSubstackFallback('missing_connection'))
  }

  // Capability gate (defense in depth — the scheduler also checks before routing here).
  if (!isSubstackActionEnabled(intent)) {
    const reason: ManualFallbackReason = FEATURES.substackDirectPublish ? 'capability_unverified' : 'direct_publish_disabled'
    recordSubstackAudit('substack_direct_publish_blocked', { ...auditBase, status: 'blocked', reason })
    throw new SubstackManualFallbackError(buildSubstackFallback(reason))
  }

  const connResult = await getConnectionWithToken(connectionId, workspaceId)
  if (!connResult.ok) {
    recordSubstackAudit('substack_manual_fallback_opened', { ...auditBase, status: 'manual_fallback', reason: 'missing_connection' })
    throw new SubstackManualFallbackError(buildSubstackFallback('missing_connection'))
  }
  const connection = connResult.data
  const publicationName = connection.metadata['publication_name'] as string | undefined

  const article = outputToCanonicalArticle(output)
  const idempotencyKey = generateIdempotencyKey({
    workspaceId,
    canonicalContentId: output.id,
    provider:           'substack',
    connectionId,
    intendedAction:     intent,
  })

  // Resolve idempotency before any provider call.
  const existing = await findExistingPublish(idempotencyKey)
  if (existing?.status === 'published') {
    return {
      postUrn: existing.providerContentId ?? existing.id,
      postUrl: existing.providerUrl ?? '',
    }
  }

  const recordResult = await createPublishedContentRecord({
    workspaceId,
    // Prefer the approver; fall back to whoever connected the publication. published_content.user_id is NOT NULL.
    userId:             output.approvedBy ?? connection.createdBy,
    connectionId,
    provider:           'substack',
    title:              output.title ?? article.title,
    sourceType:         'manual',
    sourceId:           output.id,
    canonicalContentId: output.id,
    idempotencyKey,
    contentHash:        computeContentHash(article),
  })
  if (!recordResult.ok) {
    throw Object.assign(new Error(recordResult.error), { code: 'publish_failed', retryable: true })
  }

  const result = await processPublishAttempt({
    workspaceId,
    publishedContentId: recordResult.data.id,
    connectionId,
    article,
    opts: publishOptionsFor(intent, output),
    idempotencyKey,
  })

  if (result.ok) {
    recordSubstackAudit('substack_draft_created', { ...auditBase, status: 'published', publicationName })
    return {
      postUrn: result.providerContentId ?? recordResult.data.id,
      postUrl: result.providerUrl ?? '',
    }
  }

  // Fail closed: a recognised manual-fallback reason becomes the friendly product state.
  if (isManualFallbackReason(result.code)) {
    if (result.code === 'auth_failed') {
      recordSubstackAudit('substack_connection_marked_unhealthy', { ...auditBase, status: 'failed', reason: 'auth_failed', publicationName })
    }
    recordSubstackAudit('substack_manual_fallback_opened', { ...auditBase, status: 'manual_fallback', reason: result.code, publicationName })
    throw new SubstackManualFallbackError(buildSubstackFallback(result.code))
  }

  // Otherwise a hard publish failure — surface to the scheduler's existing failure handling.
  throw Object.assign(new Error(result.error ?? 'Substack publish failed'), { code: 'publish_failed', retryable: false })
}
