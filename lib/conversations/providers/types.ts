import type { ConversationSourceType } from '@/types/domain'

export interface NormalizedItem {
  externalId: string
  contentHash: string | null      // SHA-256 of canonicalUrl
  canonicalUrl: string | null     // normalized URL (no UTM params)
  contentType: 'article' | 'note' | 'post' | 'comment'
  title: string | null
  author: string | null
  authorUrl: string | null
  publication: string | null
  sourceUrl: string               // actual URL of this specific item
  excerpt: string | null          // first 300 chars of body
  bodyMarkdown: string | null     // full content
  heroImage: string | null
  publishedAt: string | null
  metadata: Record<string, unknown>
  // Provider-native identifiers (optional; written by connector-backed providers like
  // LinkedIn-via-Unipile). providerSocialId is the reliable engagement key for Phase 4.
  provider?: string | null
  providerItemId?: string | null
  providerSocialId?: string | null
  providerUrl?: string | null
  providerMetadata?: Record<string, unknown> | null
}

// Optional context passed by the pipeline. Most providers ignore it; connector-backed
// providers (e.g. LinkedIn-via-Unipile) need the workspace to resolve their connection.
export interface ProviderFetchContext {
  workspaceId?: string
}

export interface ConversationProvider {
  sourceType: ConversationSourceType
  canHandle(url: string): boolean
  fetch(sourceUrl: string, ctx?: ProviderFetchContext): Promise<NormalizedItem[]>
}
