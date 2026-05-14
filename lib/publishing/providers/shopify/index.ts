// lib/publishing/providers/shopify/index.ts
import { decryptSecret } from '@/lib/security/encryption'
import { canonicalBodyToHtml, finalizeHtmlForShopify } from '@/lib/publishing/formatters/providers/html'
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'
import { getShopInfo, createArticle, updateArticle, deleteArticle } from './client'
import { SHOPIFY_PROVIDER_VERSION } from './types'
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

// Shopify article body limit (conservative — actual varies by plan but 2MB is safe)
const MAX_BODY_BYTES = 2 * 1024 * 1024
const MAX_EXCERPT_CHARS = 320
const MAX_TAGS = 250

const SHOPIFY_CAPABILITIES: ProviderCapabilities = {
  taxonomy:   { categories: false, tags: true,  customTaxonomies: false },
  media:      { featuredImages: true, galleries: false, embeds: false },
  // NOTE: Shopify does support meta title/description at article level via seo field,
  // but only through the API — the merchant-facing UI treats them separately.
  seo:        { metaTitle: true, metaDescription: true, canonicalUrl: false },
  // NOTE: Shopify has no native scheduled publishing via API in 2024-10.
  scheduling: { supported: false, requiresBackgroundJob: false },
  content:    { html: true, markdown: false, blocks: false },
}

function getCredentials(connection: ProviderConnection): { shopDomain: string; accessToken: string } {
  const shopDomain = connection.metadata['shop_domain'] as string | undefined
  if (!shopDomain) {
    throw new PublishingError(
      'Shopify shop domain not found in connection. Please reconnect your store.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }
  // TODO: support token refresh lifecycle if Shopify changes OAuth model —
  // currently using long-lived offline tokens, but that is not guaranteed.
  const accessToken = decryptSecret(connection.encryptedAccessToken)
  return { shopDomain, accessToken }
}

function getDefaultBlogId(connection: ProviderConnection): string {
  const blogId = connection.metadata['default_blog_id'] as string | undefined
  if (!blogId) {
    throw new PublishingError(
      'No blog selected for this Shopify store. Choose a blog in Publishing Settings.',
      PUB_ERROR.SHOPIFY_BLOG_NOT_FOUND, false,
    )
  }
  return blogId
}

export const shopifyProvider: PublishingProvider = {
  id:           'shopify' as PublishingProviderId,
  label:        'Shopify',
  authMethods:  ['oauth'],
  capabilities: SHOPIFY_CAPABILITIES,

  async testConnection(connection: ProviderConnection): Promise<ConnectionTestResult> {
    try {
      const { shopDomain, accessToken } = getCredentials(connection)
      const shop = await getShopInfo(shopDomain, accessToken)
      return {
        ok: true,
        siteInfo: { name: shop.name, url: shop.primaryDomain.url },
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection test failed' }
    }
  },

  validateContent(article: CanonicalArticle, opts: PublishOptions): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!article.title?.trim()) errors.push('Title is required.')
    if (!article.body?.length)  errors.push('Article body is empty.')

    // Capability assertion: embeds are not supported — downgrade gracefully, warn visibly
    const embedCount = article.body.filter(n => n.type === 'embed').length
    if (embedCount > 0) {
      warnings.push(`${embedCount} embed(s) will be stripped — Shopify does not support embedded media in article bodies.`)
    }

    // Payload size guard — fail early rather than letting Shopify reject silently
    const rawHtml = canonicalBodyToHtml(article.body)
    const bodyBytes = Buffer.byteLength(rawHtml, 'utf8')
    if (bodyBytes > MAX_BODY_BYTES) {
      errors.push(`Article body exceeds Shopify's 2MB limit (${Math.round(bodyBytes / 1024)}KB). Split or shorten the article.`)
    }

    const excerpt = opts.overrideExcerpt ?? article.excerpt ?? ''
    if (excerpt.length > MAX_EXCERPT_CHARS) {
      warnings.push(`Excerpt is ${excerpt.length} chars — Shopify displays up to ${MAX_EXCERPT_CHARS}. It will be truncated.`)
    }

    const tagCount = (opts.tags ?? []).length
    if (tagCount > MAX_TAGS) {
      errors.push(`Too many tags (${tagCount}). Shopify supports up to ${MAX_TAGS} per article.`)
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
      event:         'shopify.publish.start',
      provider:      'shopify',
      version:       SHOPIFY_PROVIDER_VERSION,
      connectionId:  connection.id,
      idempotencyKey,
    }))
    try {
      const { shopDomain, accessToken } = getCredentials(connection)
      const blogId = getDefaultBlogId(connection)

      const rawHtml     = canonicalBodyToHtml(article.body)
      const body        = finalizeHtmlForShopify(rawHtml)
      const isPublished = opts.status === 'publish'

      const result = await createArticle(shopDomain, accessToken, {
        blogId,
        title:       opts.overrideTitle   ?? article.title,
        body,
        summary:     opts.overrideExcerpt ?? article.excerpt,
        tags:        opts.tags ?? [],
        isPublished,
        publishedAt: isPublished ? new Date().toISOString() : undefined,
        seo: article.seo ? {
          title:       article.seo.metaTitle       ?? undefined,
          description: article.seo.metaDescription ?? undefined,
        } : undefined,
      })

      const durationMs = Math.round(performance.now() - startedAt)
      console.log(JSON.stringify({
        event:        'shopify.publish.success',
        provider:     'shopify',
        version:      SHOPIFY_PROVIDER_VERSION,
        connectionId: connection.id,
        idempotencyKey,
        durationMs,
        articleId:    result.id,
        isPublished:  result.isPublished,
      }))

      return {
        ok:                true,
        providerContentId: result.id,
        providerUrl:       result.onlineStoreUrl ?? connection.siteUrl,
        status:            result.isPublished ? 'published' : 'draft',
        publishedAt:       result.publishedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - startedAt)
      if (err instanceof PublishingError) {
        console.log(JSON.stringify({
          event:         'shopify.publish.failure',
          provider:      'shopify',
          version:       SHOPIFY_PROVIDER_VERSION,
          connectionId:  connection.id,
          idempotencyKey,
          durationMs,
          code:          err.code,
          retryable:     err.retryable,
          retryCategory: err.retryCategory,
          requestId:     err.requestId,
        }))
        return { ok: false, error: err.message, code: err.code, retryable: err.retryable, retryCategory: err.retryCategory }
      }
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error', code: PUB_ERROR.PUBLISH_FAILED, retryable: false }
    }
  },

  async update(
    connection: ProviderConnection,
    contentId: string,
    article: CanonicalArticle,
    opts: PublishOptions,
  ): Promise<PublishResult> {
    // TODO: synchronization — this overwrites provider content unconditionally.
    // Future: detect drift (provider content edited by merchant), decide source-of-truth.
    // For now: push-only, Clout wins. This will need revisiting when merchants edit articles directly.
    try {
      const { shopDomain, accessToken } = getCredentials(connection)
      const rawHtml = canonicalBodyToHtml(article.body)
      const body    = finalizeHtmlForShopify(rawHtml)

      const result = await updateArticle(shopDomain, accessToken, {
        id:      contentId,
        title:   opts.overrideTitle   ?? article.title,
        body,
        summary: opts.overrideExcerpt ?? article.excerpt,
        tags:    opts.tags ?? [],
        seo: article.seo ? {
          title:       article.seo.metaTitle       ?? undefined,
          description: article.seo.metaDescription ?? undefined,
        } : undefined,
      })

      return {
        ok:                true,
        providerContentId: result.id,
        providerUrl:       result.onlineStoreUrl ?? connection.siteUrl,
        status:            result.isPublished ? 'published' : 'draft',
        publishedAt:       result.publishedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      if (err instanceof PublishingError) return { ok: false, error: err.message, code: err.code, retryable: err.retryable }
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error', code: PUB_ERROR.UPDATE_FAILED, retryable: false }
    }
  },

  async delete(connection: ProviderConnection, contentId: string): Promise<{ ok: boolean; error?: string }> {
    // TODO: synchronization — no soft-delete, no tombstone, no drift detection.
    // If merchant already deleted the article, this will return a user error (not a failure).
    // Future: treat 404-equivalent user errors as already-deleted (idempotent delete).
    try {
      const { shopDomain, accessToken } = getCredentials(connection)
      await deleteArticle(shopDomain, accessToken, contentId)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
    }
  },
}
