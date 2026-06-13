// lib/pinterest/image.ts
// Resolves the durable, public image URL for a Pin from the output's attached visual
// asset. Pinterest fetches the image server-side, so we use the public storage URL
// (visual-assets is a public bucket), NOT the ephemeral provider original_url.
import { createServiceClient } from '@/lib/supabase/service'
import type { Output, OutputContent } from '@/types/domain'

export interface PinterestImage {
  url: string
  altText?: string
}

/** Returns the public image URL + alt text, or null if no visual asset is attached. */
export async function resolvePinterestImage(output: Output): Promise<PinterestImage | null> {
  const assetId = (output.content as OutputContent).selectedVisualAssetId
  if (!assetId) return null

  const supabase = createServiceClient()
  const { data: asset } = await supabase
    .from('visual_assets')
    .select('storage_path, original_url, description, name')
    .eq('id', assetId)
    .single()

  if (!asset) return null

  let url: string | null = null
  if (asset.storage_path) {
    const { data } = supabase.storage.from('visual-assets').getPublicUrl(asset.storage_path as string)
    url = data?.publicUrl ?? null
  }
  // Fall back to the provider URL only if no storage path exists.
  url = url ?? (asset.original_url as string | null)
  if (!url) return null

  return {
    url,
    altText: (asset.description as string | null) ?? (asset.name as string | null) ?? undefined,
  }
}
