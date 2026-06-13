/**
 * Shared social-preview primitive — public surface.
 *
 * Import everything for previews from here:
 *   import { SocialPreview, SocialPreviewModal, previewFromStudioState } from '@/components/social-preview'
 *
 * This is the single import path used by Studio today and by Review / Calendar /
 * Campaigns when those surfaces are wired later.
 */

export { SocialPreview } from './SocialPreview'
export type { SocialPreviewProps } from './SocialPreview'
export { SocialPreviewInline } from './SocialPreviewInline'
export { SocialPreviewModal } from './SocialPreviewModal'
export type { PreviewPlatformTab } from './SocialPreviewModal'
export { PreviewFrame } from './PreviewFrame'

export { usePreviewAssets } from './hooks/usePreviewAssets'
export type { PreviewAssetsResult } from './hooks/usePreviewAssets'

export { previewFromStudioState } from './adapters/fromStudioState'
export type { FromStudioStateArgs } from './adapters/fromStudioState'
export { previewFromOutput } from './adapters/fromOutput'
export type { FromOutputArgs } from './adapters/fromOutput'
export {
  resolvePreviewAuthor,
  toPreviewPlatform,
  normalizeHashtags,
} from './adapters/shared'
export type { ChannelLike } from './adapters/shared'

export type {
  PreviewData,
  PreviewAuthor,
  PreviewMedia,
  PreviewCarousel,
  PreviewTextSlide,
  PreviewLink,
  PreviewMode,
  PreviewDensity,
  PreviewTheme,
  PreviewPlatform,
} from './core/types'
