/**
 * Adapter: an Output record (+ its Channel + fetched media) → PreviewData.
 *
 * This is the seam for future surfaces (Review queue, Calendar, Campaigns,
 * approval modals) — they have exactly this shape. Not wired anywhere yet.
 */

import type { Output, OutputContent } from '@/types/domain'
import type { PreviewCarousel, PreviewData, PreviewMedia } from '../core/types'
import { ChannelLike, normalizeHashtags, resolvePreviewAuthor, toPreviewPlatform } from './shared'

export interface FromOutputArgs {
  output: Output
  channel: ChannelLike | null | undefined
  media?: PreviewMedia[] | null
  carousel?: PreviewCarousel | null
}

export function previewFromOutput({ output, channel, media, carousel }: FromOutputArgs): PreviewData {
  const content = (output.content ?? {}) as OutputContent
  const platform = toPreviewPlatform(channel?.platform)
  const author = resolvePreviewAuthor(channel)

  return {
    platform,
    author,
    title: output.title?.trim() || undefined,
    body: content.body ?? '',
    hashtags: normalizeHashtags(content.hashtags as string[] | undefined),
    media: media ?? undefined,
    carousel: carousel ?? undefined,
    timestamp: output.publishedAt ?? undefined,
  }
}
