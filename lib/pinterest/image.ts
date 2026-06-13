// lib/pinterest/image.ts
// Resolves the durable, public image URL for a Pin from the output's attached visual
// asset. Pinterest fetches the image server-side, so we use the public storage URL
// (visual-assets is a public bucket), NOT the ephemeral provider original_url.
// Delegates to the shared resolveVisualAssetUrl primitive.
import { resolveVisualAssetUrl } from '@/lib/visual/storage/resolveVisualAssetUrl'
import type { Output, OutputContent } from '@/types/domain'

export interface PinterestImage {
  url: string
  altText?: string
}

/** Returns the public image URL + alt text, or null if no visual asset is attached. */
export async function resolvePinterestImage(output: Output): Promise<PinterestImage | null> {
  const assetId = (output.content as OutputContent).selectedVisualAssetId
  if (!assetId) return null

  const resolved = await resolveVisualAssetUrl(assetId)
  if (!resolved) return null

  return {
    url:     resolved.url,
    altText: resolved.altText ?? undefined,
  }
}
