/**
 * Shared adapter helpers — pure, framework-free. Map source data (channels,
 * outputs) into the preview domain. Renderers must never see DB rows.
 */

import type { ChannelPlatform } from '@/types/domain'
import type { PreviewAuthor, PreviewPlatform } from '../core/types'

/**
 * Loose channel shape. The Studio page's `FullChannel` and the domain `Channel`
 * both satisfy this (extra fields like `profile_image_url` / `config` arrive via
 * the index signature). We read defensively.
 */
export interface ChannelLike {
  platform?: string | null
  label?: string | null
  account_id?: string | null
  accountId?: string | null
  profile_image_url?: string | null
  profileImageUrl?: string | null
  config?: Record<string, unknown> | null
  [key: string]: unknown
}

/** Map a Clout `ChannelPlatform` into the normalized preview platform union. */
export function toPreviewPlatform(platform: ChannelPlatform | string | null | undefined): PreviewPlatform {
  switch (platform) {
    case 'linkedin': return 'linkedin'
    case 'x':
    case 'twitter': return 'x'
    case 'threads': return 'threads'
    case 'instagram': return 'instagram'
    case 'facebook': return 'facebook'
    case 'bluesky': return 'bluesky'
    case 'mastodon': return 'mastodon'
    case 'tiktok': return 'tiktok'
    case 'substack':
    case 'newsletter': return 'substack'
    case 'google_business_profile': return 'google_business'
    case 'wordpress':
    case 'medium':
    case 'blog': return 'article'
    default: return 'fallback'
  }
}

function readHandle(channel: ChannelLike | null | undefined): string | undefined {
  if (!channel) return undefined
  const fromConfig = channel.config && typeof channel.config === 'object'
    ? (channel.config as Record<string, unknown>).handle
    : undefined
  const handle = (fromConfig ?? channel.handle ?? channel.username) as unknown
  if (typeof handle === 'string' && handle.trim()) {
    return handle.trim().replace(/^@/, '')
  }
  return undefined
}

/**
 * Resolve the author block from a channel.
 *
 * Rules (deliberately conservative):
 *  - name: label → account → platform → fallbackName.
 *  - handle: ONLY from real metadata (config.handle / handle / username).
 *    Never fabricated from a slug.
 *  - avatarUrl: ONLY the real profile_image_url column.
 *  - verified: never inferred here — left undefined unless explicitly provided
 *    by a caller with trusted metadata.
 */
export function resolvePreviewAuthor(
  channel: ChannelLike | null | undefined,
  fallbackName = '',
): PreviewAuthor {
  const name =
    (channel?.label as string | undefined)?.trim() ||
    (channel?.account_id as string | undefined) ||
    (channel?.accountId as string | undefined) ||
    fallbackName ||
    (channel?.platform as string | undefined) ||
    'Account'

  const avatarUrl =
    (channel?.profile_image_url as string | undefined) ||
    (channel?.profileImageUrl as string | undefined) ||
    undefined

  return {
    name,
    handle: readHandle(channel),
    avatarUrl: avatarUrl || undefined,
  }
}

/** Normalize a hashtag list to bare tags (no leading #). */
export function normalizeHashtags(tags: string[] | undefined | null): string[] {
  if (!tags) return []
  return tags.map((t) => t.replace(/^#/, '').trim()).filter(Boolean)
}
