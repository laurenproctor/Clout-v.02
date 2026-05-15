import type { PublishingTarget } from '@/lib/publishing/types/target'

export const MEDIUM_PROVIDER_VERSION = '1'

// ─── API Response Types ───────────────────────────────────────────────────────

export interface MediumUser {
  id: string
  username: string
  name: string
  url: string
  imageUrl: string
}

export interface MediumPublication {
  id: string
  name: string
  description: string
  tagline: string
  url: string
  imageUrl: string
}

export interface MediumPost {
  id: string
  title: string
  authorId: string
  url: string
  canonicalUrl: string
  publishStatus: 'public' | 'draft' | 'unlisted'
  publishedAt: number  // epoch ms
  tags: string[]
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface MediumCreatePostPayload {
  title: string
  contentFormat: 'html' | 'markdown'
  content: string
  canonicalUrl?: string
  tags?: string[]
  publishStatus: 'public' | 'draft' | 'unlisted'
  notifyFollowers?: boolean
}

// ─── Connection Metadata ──────────────────────────────────────────────────────
// Stored in publishing_connections.metadata (JSON).
// publications uses PublishingTarget[] — not Medium-specific types.

export interface MediumConnectionMetadata {
  medium_user_id: string
  medium_username: string
  medium_name: string
  medium_url: string
  medium_image_url: string
  publications: PublishingTarget[]
  selected_publication_id: string | null
  scopes: string[]
  oauth_connected_at: string
  refresh_token_encrypted?: string
  token_expires_at?: number
}
