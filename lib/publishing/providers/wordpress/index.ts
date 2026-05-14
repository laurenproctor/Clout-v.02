import { decryptSecret } from '@/lib/security/encryption'
import { canonicalBodyToHtml, finalizeHtmlForWordPress } from '@/lib/publishing/formatters/providers/html'
import { PublishingError, PUB_ERROR } from '@/lib/publishing/errors'
import { discoverSite, verifyCredentials, createPost, updatePost, deletePost } from './client'
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

const WORDPRESS_CAPABILITIES: ProviderCapabilities = {
  taxonomy:   { categories: true,  tags: true,  customTaxonomies: false },
  media:      { featuredImages: true, galleries: false, embeds: false },
  seo:        { metaTitle: false, metaDescription: false, canonicalUrl: false },
  scheduling: { supported: true,  requiresBackgroundJob: false },
  content:    { html: true, markdown: false, blocks: false },
}

function getDecryptedCredentials(connection: ProviderConnection): { username: string; password: string } {
  const username = connection.metadata['wp_username'] as string | undefined
  if (!username) {
    throw new PublishingError(
      'WordPress username not found. Please reconnect your site.',
      PUB_ERROR.AUTH_FAILED, false,
    )
  }
  const password = decryptSecret(connection.encryptedAccessToken)
  return { username, password }
}

export const wordPressProvider: PublishingProvider = {
  id:           'wordpress' as PublishingProviderId,
  label:        'WordPress',
  authMethods:  ['application_password'],
  capabilities: WORDPRESS_CAPABILITIES,

  async testConnection(connection: ProviderConnection): Promise<ConnectionTestResult> {
    try {
      const siteInfo = await discoverSite(connection.siteUrl)
      const { username, password } = getDecryptedCredentials(connection)
      await verifyCredentials(connection.siteUrl, username, password)
      return { ok: true, siteInfo: { name: siteInfo.name, url: siteInfo.url } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection test failed' }
    }
  },

  validateContent(article: CanonicalArticle, _opts: PublishOptions): ValidationResult {
    // TODO: capability-aware validation — future providers require unsupported node detection,
    // embed compatibility, media validation, scheduling constraints, and provider-specific
    // content warnings (Ghost vs Notion vs Substack all strip/reject different content differently).
    const errors: string[] = []
    const warnings: string[] = []
    if (!article.title?.trim()) errors.push('Title is required.')
    if (!article.body?.length)  errors.push('Article body is empty.')
    if (article.title && article.title.length > 200) {
      warnings.push('Title is very long — consider keeping it under 60 characters for SEO.')
    }
    return { valid: errors.length === 0, errors, warnings }
  },

  async publish(
    connection: ProviderConnection,
    article: CanonicalArticle,
    opts: PublishOptions,
    _idempotencyKey: string,
  ): Promise<PublishResult> {
    const validation = this.validateContent(article, opts)
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(' '), code: PUB_ERROR.MALFORMED_CONTENT, retryable: false }
    }

    try {
      const { username, password } = getDecryptedCredentials(connection)
      const rawHtml  = canonicalBodyToHtml(article.body)
      const content  = finalizeHtmlForWordPress(rawHtml)
      const wpStatus = opts.status === 'scheduled' ? 'future' : opts.status

      const post = await createPost(connection.siteUrl, username, password, {
        title:   opts.overrideTitle   ?? article.title,
        content,
        excerpt: opts.overrideExcerpt ?? article.excerpt,
        slug:    opts.overrideSlug    ?? article.slug,
        status:  wpStatus as 'draft' | 'publish' | 'future',
        date:    opts.scheduledAt,
      })

      const resolvedStatus =
        post.status === 'publish' ? 'published' :
        post.status === 'future'  ? 'scheduled' : 'draft'

      return {
        ok:                true,
        providerContentId: String(post.id),
        providerUrl:       post.link,
        status:            resolvedStatus,
        publishedAt:       post.date,
      }
    } catch (err) {
      if (err instanceof PublishingError) {
        return { ok: false, error: err.message, code: err.code, retryable: err.retryable }
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
    try {
      const { username, password } = getDecryptedCredentials(connection)
      const content = finalizeHtmlForWordPress(canonicalBodyToHtml(article.body))
      const post = await updatePost(connection.siteUrl, username, password, Number(contentId), {
        title:   opts.overrideTitle   ?? article.title,
        content,
        excerpt: opts.overrideExcerpt ?? article.excerpt,
        slug:    opts.overrideSlug    ?? article.slug,
        status:  opts.status === 'scheduled' ? 'future' : opts.status as 'draft' | 'publish',
      })
      return {
        ok:                true,
        providerContentId: String(post.id),
        providerUrl:       post.link,
        status:            post.status === 'publish' ? 'published' : 'draft',
        publishedAt:       post.date,
      }
    } catch (err) {
      if (err instanceof PublishingError) return { ok: false, error: err.message, code: err.code, retryable: err.retryable }
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error', code: PUB_ERROR.UPDATE_FAILED, retryable: false }
    }
  },

  async delete(connection: ProviderConnection, contentId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { username, password } = getDecryptedCredentials(connection)
      await deletePost(connection.siteUrl, username, password, Number(contentId))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
    }
  },
}
