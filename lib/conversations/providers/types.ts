import type { ConversationSourceType } from '@/types/domain'

export interface NormalizedItem {
  externalId: string
  contentHash: string | null      // SHA-256 of canonicalUrl
  canonicalUrl: string | null     // normalized URL (no UTM params)
  contentType: 'article' | 'note' | 'post'
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
}

export interface ConversationProvider {
  sourceType: ConversationSourceType
  canHandle(url: string): boolean
  fetch(sourceUrl: string): Promise<NormalizedItem[]>
}
