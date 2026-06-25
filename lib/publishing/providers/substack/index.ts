import { canonicalBodyToSubstackHtml } from '@/lib/publishing/formatters/providers/substack-html'
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'
import { isSubstackActionEnabled, FEATURES } from '@/lib/features'
import { getActiveSession, forceRenewSession } from './session'
import { recordSubstackAudit } from './audit'
import { SubstackAuthError, SubstackApiError, verifySession, createDraft, updateDraft, deleteDraft } from './client'
import type {
  PublishingProvider,
  PublishingProviderId,
  ProviderCapabilities,
  ProviderConnection,
  PublishOptions,
  PublishResult,
  ConnectionTestResult,
  ValidationResult,
  SubstackIntendedAction,
  ManualFallbackReason,
} from '@/lib/publishing/types'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'

// The user's explicit Substack action. Defaults conservatively from legacy PublishOptions
// status when not provided — a non-draft status implies a (gated-off) web publish, never
// a silent downgrade. Notes always pass substackIntendedAction explicitly.
function resolveIntendedAction(opts: PublishOptions): SubstackIntendedAction {
  if (opts.substackIntendedAction) return opts.substackIntendedAction
  return opts.status === 'draft' ? 'substack_newsletter_draft' : 'substack_newsletter_publish_web'
}

// Fail-closed PublishResult whose `code` is a ManualFallbackReason. The bridge/UI map this
// code through buildSubstackFallback() into the friendly manual-fallback product state.
function failClosed(reason: ManualFallbackReason, message: string): PublishResult & { ok: false } {
  return { ok: false, error: message, code: reason, retryable: false }
}

// Runs a session-bound call, renewing the session exactly once if the call reports an
// auth failure on a session we believed was valid. Emits an audit event if renewal fails.
async function withSessionRetry<T>(
  connection: ProviderConnection,
  fn: (sessionCookie: string) => Promise<T>,
): Promise<T> {
  const cookie = await getActiveSession(connection)
  try {
    return await fn(cookie)
  } catch (err) {
    if (!(err instanceof SubstackAuthError)) throw err
    let renewed: string
    try {
      renewed = await forceRenewSession(connection)
    } catch (renewErr) {
      recordSubstackAudit('substack_session_renewal_failed', {
        workspaceId: connection.workspaceId,
        publishingConnectionId: connection.id,
        publicationName: connection.metadata['publication_name'] as string | undefined,
        reason: 'renewal_failed',
      })
      throw renewErr
    }
    return fn(renewed)  // retry exactly once with the renewed session
  }
}

const SUBSTACK_CAPABILITIES: ProviderCapabilities = {
  taxonomy:   { categories: false, tags: false, customTaxonomies: false },
  media:      { featuredImages: false, galleries: false, embeds: false },
  seo:        { metaTitle: false, metaDescription: false, canonicalUrl: false },
  scheduling: { nativeScheduling: false, platformScheduling: false, requiresBackgroundJob: false },
  content:    { html: true, markdown: false, blocks: false },
}

function getSubdomain(connection: ProviderConnection): string {
  const subdomain = connection.metadata['publication_subdomain'] as string | undefined
  if (!subdomain) {
    throw new PublishingError(
      'Substack publication subdomain not found. Please reconnect your account.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }
  return subdomain
}

function classifyError(err: unknown): PublishResult & { ok: false } {
  if (err instanceof SubstackAuthError) {
    return { ok: false, error: err.message, code: PUB_ERROR.AUTH_FAILED, retryable: false }
  }
  if (err instanceof SubstackApiError) {
    return { ok: false, error: err.message, code: PUB_ERROR.PUBLISH_FAILED, retryable: err.retryable }
  }
  if (err instanceof PublishingError) {
    return { ok: false, error: err.message, code: err.code, retryable: err.retryable }
  }
  return { ok: false, error: err instanceof Error ? err.message : 'Unknown error', code: PUB_ERROR.PUBLISH_FAILED, retryable: false }
}

export const substackProvider: PublishingProvider = {
  id:           'substack' as PublishingProviderId,
  label:        'Substack',
  stability:    'experimental',
  authMethods:  ['api_key'],
  capabilities: SUBSTACK_CAPABILITIES,

  async testConnection(connection: ProviderConnection): Promise<ConnectionTestResult> {
    try {
      const sessionCookie = await getActiveSession(connection)
      const userInfo      = await verifySession(sessionCookie)
      const subdomain     = connection.metadata['publication_subdomain'] as string | undefined
      return {
        ok: true,
        siteInfo: {
          name: userInfo.publicationName ?? connection.metadata['publication_name'] as string ?? 'Substack',
          url:  subdomain ? `https://${subdomain}.substack.com` : 'https://substack.com',
        },
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection test failed' }
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implements PublishProvider.validateContent signature
  validateContent(article: CanonicalArticle, _opts: PublishOptions): ValidationResult {
    const errors: string[]   = []
    const warnings: string[] = []
    if (!article.title?.trim())  errors.push('Title is required.')
    if (!article.body?.length)   errors.push('Article body is empty.')
    if (article.title && article.title.length > 200) {
      warnings.push('Title is very long — Substack works best with titles under 80 characters.')
    }
    return { valid: errors.length === 0, errors, warnings }
  },

  async publish(
    connection: ProviderConnection,
    article: CanonicalArticle,
    opts: PublishOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- implements PublishProvider.publish signature
    _idempotencyKey: string,
  ): Promise<PublishResult> {
    const action = resolveIntendedAction(opts)
    const auditBase = {
      workspaceId: connection.workspaceId,
      publishingConnectionId: connection.id,
      intendedAction: action,
      publicationName: connection.metadata['publication_name'] as string | undefined,
    }

    // ── Capability gate (fail closed) ────────────────────────────────────────
    // Direct actions require FEATURES.substackDirectPublish AND their capability flag.
    // The markdown research doc is NEVER consulted here — only the runtime constants.
    if (!isSubstackActionEnabled(action)) {
      const reason: ManualFallbackReason = FEATURES.substackDirectPublish
        ? 'capability_unverified'      // master on, this capability not yet verified
        : 'direct_publish_disabled'    // master switch off
      recordSubstackAudit('substack_direct_publish_blocked', { ...auditBase, status: 'blocked', reason })
      return failClosed(reason, 'Direct publishing is not available yet. Copy the content or open Substack to finish manually.')
    }

    const validation = this.validateContent(article, opts)
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(' '), code: PUB_ERROR.MALFORMED_CONTENT, retryable: false }
    }

    // ── Draft creation (the only verified capability) ────────────────────────
    if (action === 'substack_newsletter_draft') {
      try {
        const subdomain = getSubdomain(connection)
        const html      = canonicalBodyToSubstackHtml(article.body)
        const draft = await withSessionRetry(connection, (cookie) => createDraft(cookie, {
          title:    opts.overrideTitle   ?? article.title,
          body:     html,
          subtitle: opts.overrideExcerpt ?? article.excerpt,
          subdomain,
        }))

        // Fail closed on an unexpected shape — never fabricate a public URL or mark published.
        if (!draft.id) {
          recordSubstackAudit('substack_unexpected_response_shape', { ...auditBase, status: 'failed', reason: 'missing_id' })
          return failClosed('unexpected_response_shape', 'Substack returned an unexpected response.')
        }
        if (!draft.url) {
          recordSubstackAudit('substack_missing_provider_url', { ...auditBase, status: 'failed', reason: 'missing_url' })
          return failClosed('missing_provider_url', 'Substack did not return a draft URL.')
        }

        recordSubstackAudit('substack_draft_created', { ...auditBase, status: 'draft' })
        return {
          ok:                true,
          providerContentId: String(draft.id),
          providerUrl:       draft.url,
          status:            'draft',
          publishedAt:       new Date().toISOString(),
        }
      } catch (err) {
        return classifyError(err)
      }
    }

    // ── Direct actions (note publish / web publish / send email) ─────────────
    // These passed the capability gate, but their endpoints are undocumented and not yet
    // captured in docs/research/substack-api.md. We MUST NOT guess payload shapes — fail
    // closed to the manual fallback rather than call an unverified endpoint.
    // TODO(phase): implement the live call here once the matching research section is
    // captured and reviewed, keyed by `action`.
    recordSubstackAudit(
      action === 'substack_newsletter_send_email'
        ? 'substack_email_subscribers_requested'
        : 'substack_publish_on_substack_requested',
      { ...auditBase, status: 'blocked', reason: 'endpoint_not_implemented' },
    )
    return failClosed('capability_unverified', 'Direct publishing is not available yet. Copy the content or open Substack to finish manually.')
  },

  async update(
    connection: ProviderConnection,
    contentId: string,
    article: CanonicalArticle,
    opts: PublishOptions,
  ): Promise<PublishResult> {
    try {
      const sessionCookie = await getActiveSession(connection)
      const subdomain     = getSubdomain(connection)
      const html          = canonicalBodyToSubstackHtml(article.body)

      const draft = await updateDraft(sessionCookie, {
        postId:   Number(contentId),
        subdomain,
        title:    opts.overrideTitle   ?? article.title,
        body:     html,
        subtitle: opts.overrideExcerpt ?? article.excerpt,
      })

      return {
        ok:                true,
        providerContentId: String(draft.id),
        providerUrl:       draft.url,
        status:            'draft',
        publishedAt:       new Date().toISOString(),
      }
    } catch (err) {
      const result = classifyError(err)
      return { ...result, code: result.code === PUB_ERROR.PUBLISH_FAILED ? PUB_ERROR.UPDATE_FAILED : result.code }
    }
  },

  async delete(connection: ProviderConnection, contentId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const sessionCookie = await getActiveSession(connection)
      const subdomain     = getSubdomain(connection)
      await deleteDraft(sessionCookie, subdomain, Number(contentId))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
    }
  },
}
