import type { CanonicalArticle } from '../canonical/types'
export type { CanonicalArticle }

export type PublishingProviderId =
  | 'wordpress' | 'ghost' | 'webflow' | 'substack'
  | 'medium' | 'shopify' | 'notion' | 'hubspot' | 'beehiiv'

// ─── Lifecycle state machine ──────────────────────────────────────────────────

export type PublishState =
  | 'queued'
  | 'processing'
  | 'published'
  | 'failed'
  | 'retrying'
  | 'cancelled'
  | 'scheduled'

// ─── Provider capabilities ────────────────────────────────────────────────────

export interface ProviderCapabilities {
  taxonomy: {
    categories: boolean
    tags: boolean
    customTaxonomies: boolean
  }
  media: {
    featuredImages: boolean
    galleries: boolean
    embeds: boolean
  }
  seo: {
    metaTitle: boolean
    metaDescription: boolean
    canonicalUrl: boolean
  }
  scheduling: {
    supported: boolean
    requiresBackgroundJob: boolean
  }
  content: {
    html: boolean
    markdown: boolean
    blocks: boolean
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────

export interface ProviderConnection {
  id: string
  workspaceId: string
  createdBy: string
  provider: PublishingProviderId
  label: string
  siteUrl: string
  encryptedAccessToken: string          // AES-256-GCM ciphertext — never expose to client
  metadata: Record<string, unknown>     // e.g. { wp_username: 'admin' }
  isActive: boolean
  lastSuccessfulPublishAt: string | null
  lastFailedPublishAt: string | null
  consecutiveFailureCount: number
  lastErrorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ProviderConnectionSafe {
  id: string
  workspaceId: string
  provider: PublishingProviderId
  label: string
  siteUrl: string
  metadata: Record<string, unknown>
  isActive: boolean
  lastSuccessfulPublishAt: string | null
  consecutiveFailureCount: number
  lastErrorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateConnectionInput {
  workspaceId: string
  userId: string
  provider: PublishingProviderId
  label: string
  siteUrl: string
  encryptedAccessToken: string
  metadata: Record<string, unknown>
}

// ─── Publish options ──────────────────────────────────────────────────────────

export interface PublishOptions {
  status: 'draft' | 'publish' | 'scheduled'
  scheduledAt?: string        // ISO8601, only when status = 'scheduled'
  overrideTitle?: string
  overrideSlug?: string
  overrideExcerpt?: string
  categories?: string[]
  tags?: string[]
  featuredImageUrl?: string
}

// ─── Results ─────────────────────────────────────────────────────────────────

export type PublishResult =
  | {
      ok: true
      providerContentId: string
      providerUrl: string
      status: 'draft' | 'published' | 'scheduled'
      publishedAt: string
    }
  | {
      ok: false
      error: string
      code: string
      retryable: boolean
    }

export interface ConnectionTestResult {
  ok: boolean
  siteInfo?: { name: string; url: string; version?: string }
  error?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface PublishingProvider {
  readonly id: PublishingProviderId
  readonly label: string
  readonly authMethods: ReadonlyArray<'application_password' | 'oauth' | 'api_key'>
  readonly capabilities: ProviderCapabilities

  testConnection(connection: ProviderConnection): Promise<ConnectionTestResult>
  validateContent(article: CanonicalArticle, opts: PublishOptions): ValidationResult
  publish(
    connection: ProviderConnection,
    article: CanonicalArticle,
    opts: PublishOptions,
    idempotencyKey: string,
  ): Promise<PublishResult>
  update(
    connection: ProviderConnection,
    contentId: string,
    article: CanonicalArticle,
    opts: PublishOptions,
  ): Promise<PublishResult>
  delete(connection: ProviderConnection, contentId: string): Promise<{ ok: boolean; error?: string }>
}

// ─── Published content record ─────────────────────────────────────────────────

export interface PublishedContent {
  id: string
  workspaceId: string
  userId: string
  connectionId: string | null
  provider: PublishingProviderId
  providerContentId: string | null
  providerUrl: string | null
  title: string
  slug: string | null
  status: PublishState
  sourceType: 'blog' | 'manual'
  sourceId: string | null
  canonicalContentId: string | null
  idempotencyKey: string | null
  contentHash: string | null
  providerMetadataVersion: string
  metadata: Record<string, unknown>
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePublishedContentInput {
  workspaceId: string
  userId: string
  connectionId: string
  provider: PublishingProviderId
  title: string
  slug?: string
  sourceType: 'blog' | 'manual'
  sourceId?: string
  canonicalContentId?: string
  idempotencyKey: string
  contentHash: string
}

// ─── Publishing job ───────────────────────────────────────────────────────────

export interface PublishingJob {
  id: string
  workspaceId: string
  userId: string
  connectionId: string | null
  publishedContentId: string | null
  provider: PublishingProviderId
  status: PublishState
  scheduledFor: string | null
  attemptCount: number
  nextRetryAt: string | null
  idempotencyKey: string | null
  contentHash: string | null
  providerMetadataVersion: string
  // TODO: canonical_content table — payload currently embeds CanonicalArticle JSON.
  // Jobs are ephemeral; canonical content is durable. These are different persistence concerns.
  // Future: replace with canonical_content_id FK once canonical_content table exists.
  payload: Record<string, unknown>
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
