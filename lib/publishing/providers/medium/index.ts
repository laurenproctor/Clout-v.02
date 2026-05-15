import { decryptSecret } from '@/lib/security/encryption'
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'
import { extractEditorialProfile } from '@/lib/publishing/editorial/types'
import { MediumClient } from './client'
import { transformOutputForMedium } from './formatter'
import { MEDIUM_PROVIDER_VERSION } from './types'
import type { MediumConnectionMetadata } from './types'
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

const MAX_MEDIUM_TAGS = 5

const MEDIUM_CAPABILITIES: ProviderCapabilities = {
  taxonomy:   { categories: false, tags: true,  customTaxonomies: false },
  media:      { featuredImages: false, galleries: false, embeds: true },
  seo:        { metaTitle: false, metaDescription: false, canonicalUrl: true },
  // Medium API (v1) has no native server-side scheduling. Clout queue simulates
  // scheduling via Trigger.dev (requiresBackgroundJob: true).
  scheduling: { nativeScheduling: false, platformScheduling: true, requiresBackgroundJob: true },
  content:    { html: true, markdown: false, blocks: false },
}

function getCredentials(connection: ProviderConnection): { accessToken: string; meta: MediumConnectionMetadata } {
  const accessToken = decryptSecret(connection.encryptedAccessToken)
  const meta = connection.metadata as unknown as MediumConnectionMetadata
  if (!meta.medium_user_id) {
    throw new PublishingError(
      'Medium user ID not found in connection. Please reconnect your account.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }
  return { accessToken, meta }
}

export const mediumProvider: PublishingProvider = {
  id:           'medium' as PublishingProviderId,
  label:        'Medium',
  stability:    'legacy',
  authMethods:  ['oauth'],
  capabilities: MEDIUM_CAPABILITIES,

  async testConnection(connection: ProviderConnection): Promise<ConnectionTestResult> {
    try {
      const { accessToken } = getCredentials(connection)
      const client = new MediumClient(accessToken)
      const user = await client.getUser()
      return { ok: true, siteInfo: { name: user.username, url: user.url } }
    } catch (err) {
      if (err instanceof PublishingError && err.code === PUB_ERROR.MEDIUM_INVALID_TOKEN) {
        return { ok: false, error: 'Token invalid or expired. Reconnect your Medium account.' }
      }
      return { ok: false, error: err instanceof Error ? err.message : 'Connection test failed' }
    }
  },

  validateContent(article: CanonicalArticle, opts: PublishOptions): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!article.title?.trim()) errors.push('Title is required.')
    if (!article.body?.length)  errors.push('Article body is empty.')

    if (article.seo?.canonicalUrl) {
      try {
        new URL(article.seo.canonicalUrl)
      } catch {
        errors.push('Canonical URL is not a valid URL.')
      }
    }

    const tagCount = (opts.tags ?? article.tags ?? []).length
    if (tagCount > MAX_MEDIUM_TAGS) {
      warnings.push(`${tagCount} tags provided — Medium supports up to ${MAX_MEDIUM_TAGS}. Only the first ${MAX_MEDIUM_TAGS} will be used.`)
    }

    return { valid: errors.length === 0, errors, warnings }
  },

  async publish(
    connection: ProviderConnection,
    article: CanonicalArticle,
    opts: PublishOptions,
    idempotencyKey: string,
  ): Promise<PublishResult> {
    const validation = this.validateContent(article, opts)
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(' '), code: PUB_ERROR.MALFORMED_CONTENT, retryable: false }
    }

    const startedAt = performance.now()
    console.log(JSON.stringify({
      event:         'medium.publish.start',
      provider:      'medium',
      version:       MEDIUM_PROVIDER_VERSION,
      connectionId:  connection.id,
      idempotencyKey,
    }))

    try {
      const { accessToken, meta } = getCredentials(connection)
      const client = new MediumClient(accessToken)

      const profile = extractEditorialProfile(article, opts)
      const { html, warnings } = transformOutputForMedium(article, profile)

      if (warnings.length > 0) {
        console.log(JSON.stringify({
          event:         'medium.publish.formatter_warnings',
          connectionId:  connection.id,
          idempotencyKey,
          warnings:      warnings.map(w => ({ type: w.type, message: w.message })),
        }))
      }

      const tags   = (opts.tags ?? profile.narrative.tags ?? []).slice(0, MAX_MEDIUM_TAGS)
      const status: 'draft' | 'public' = opts.status === 'draft' ? 'draft' : 'public'

      const payload = {
        title:           profile.editorial.title,
        contentFormat:   'html' as const,
        content:         html,
        canonicalUrl:    profile.seo.canonicalUrl,
        tags,
        publishStatus:   status,
        notifyFollowers: status === 'public',
      }

      const post = meta.selected_publication_id
        ? await client.createPublicationPost(meta.selected_publication_id, payload)
        : await client.createUserPost(meta.medium_user_id, payload)

      const durationMs = Math.round(performance.now() - startedAt)
      console.log(JSON.stringify({
        event:        'medium.publish.success',
        provider:     'medium',
        version:      MEDIUM_PROVIDER_VERSION,
        connectionId: connection.id,
        idempotencyKey,
        durationMs,
        postId:       post.id,
        publishStatus: post.publishStatus,
      }))

      return {
        ok:                true,
        providerContentId: post.id,
        providerUrl:       post.url,
        status:            post.publishStatus === 'public' ? 'published' : 'draft',
        publishedAt:       post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - startedAt)
      if (err instanceof PublishingError) {
        console.log(JSON.stringify({
          event:         'medium.publish.failure',
          provider:      'medium',
          version:       MEDIUM_PROVIDER_VERSION,
          connectionId:  connection.id,
          idempotencyKey,
          durationMs,
          code:          err.code,
          retryable:     err.retryable,
          retryCategory: err.retryCategory,
        }))
        return { ok: false, error: err.message, code: err.code, retryable: err.retryable, retryCategory: err.retryCategory }
      }
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error', code: PUB_ERROR.PUBLISH_FAILED, retryable: false }
    }
  },

  // Medium API v1 does not support post updates. Edits must be made on medium.com.
  async update(): Promise<PublishResult> {
    return {
      ok:        false,
      error:     'Medium API does not support post updates. Edit the post directly on medium.com.',
      code:      PUB_ERROR.MEDIUM_UPDATE_NOT_SUPPORTED,
      retryable: false,
    }
  },

  // Medium API v1 does not support post deletion. Deletions must be done on medium.com.
  async delete(): Promise<{ ok: boolean; error?: string }> {
    return {
      ok:    false,
      error: 'Medium API does not support post deletion. Delete the post directly on medium.com.',
    }
  },
}
