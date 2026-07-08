/**
 * Adapter: live Studio editor state → PreviewData. Pure function the Studio
 * page calls on each render (memoize at the call site over its inputs).
 */

import type { ChannelPlatform } from '@/types/domain'
import type { BodySegment, PreviewCarousel, PreviewData, PreviewMedia } from '../core/types'
import { ChannelLike, normalizeHashtags, resolvePreviewAuthor, toPreviewPlatform } from './shared'

export interface FromStudioStateArgs {
  platform: ChannelPlatform | string | null | undefined
  channel: ChannelLike | null | undefined
  /** Display name fallback when the channel lacks a label. */
  accountName?: string
  body: string
  bodySegments?: BodySegment[]
  title?: string
  hashtags?: string[]
  media?: PreviewMedia[] | null
  mediaPending?: boolean
  carousel?: PreviewCarousel | null
}

export function previewFromStudioState(args: FromStudioStateArgs): PreviewData {
  const platform = toPreviewPlatform(args.platform)
  const author = resolvePreviewAuthor(args.channel, args.accountName)

  return {
    platform,
    author,
    title: args.title?.trim() || undefined,
    body: args.body ?? '',
    bodySegments: args.bodySegments && args.bodySegments.length ? args.bodySegments : undefined,
    hashtags: normalizeHashtags(args.hashtags),
    media: args.media ?? undefined,
    mediaPending: args.mediaPending ?? undefined,
    carousel: args.carousel ?? undefined,
  }
}
