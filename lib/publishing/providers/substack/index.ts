import { canonicalBodyToSubstackHtml } from '@/lib/publishing/formatters/providers/substack-html'
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'
import { getActiveSession } from './session'
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
} from '@/lib/publishing/types'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'

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
    _idempotencyKey: string,
  ): Promise<PublishResult> {
    if (opts.status === 'publish' || opts.status === 'scheduled') {
      return {
        ok:        false,
        error:     'Direct publishing to Substack is not available in V1. Create a draft and use "Open in Substack" to publish from the Substack editor.',
        code:      'direct_publish_not_available',
        retryable: false,
      }
    }

    const validation = this.validateContent(article, opts)
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(' '), code: PUB_ERROR.MALFORMED_CONTENT, retryable: false }
    }

    try {
      const sessionCookie = await getActiveSession(connection)
      const subdomain     = getSubdomain(connection)
      const html          = canonicalBodyToSubstackHtml(article.body)

      const draft = await createDraft(sessionCookie, {
        title:    opts.overrideTitle   ?? article.title,
        body:     html,
        subtitle: opts.overrideExcerpt ?? article.excerpt,
        subdomain,
      })

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
