// lib/visual/storage/resolveVisualAssetUrl.ts
// Single source of truth for resolving a durable, public image URL from a stored
// visual asset at publish time. Platforms (Pinterest, Instagram, LinkedIn) fetch the
// image server-side, so we resolve the canonical `storage_path` to a public URL from
// the public `visual-assets` bucket, falling back to the stored `original_url`.
//
// Separation of concerns: this resolver ONLY resolves a URL. It does NOT validate
// remote fetchability, content-type, or size — that is the publisher's responsibility
// (see the Instagram publish-time preflight). Resolver resolves; publisher validates.
import { createServiceClient } from '@/lib/supabase/service'

export interface ResolvedVisualAssetUrl {
  url: string
  altText?: string | null
  name?: string | null
  storagePath?: string | null
}

/**
 * Resolve a visual asset id to its durable public URL.
 *
 * Resolution order:
 *   1. If `storage_path` is set, return the public URL derived from it
 *      (`visual-assets` is a public bucket). `storage_path` is the canonical path of
 *      the stored file — regenerating the URL from it is more durable than trusting
 *      the persisted `original_url` string.
 *   2. Else fall back to `original_url`.
 *   3. Else return `null`.
 *
 * Alt text prefers `description`, then `name`.
 *
 * Uses the service client (publish paths run server-side and bypass RLS).
 */
export async function resolveVisualAssetUrl(
  assetId: string,
): Promise<ResolvedVisualAssetUrl | null> {
  if (!assetId) return null

  // `description`/`name` were added after the generated DB types were last produced,
  // so cast to keep the select typed-loose (mirrors lib/pinterest/image.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data: asset } = await supabase
    .from('visual_assets')
    .select('storage_path, original_url, description, name')
    .eq('id', assetId)
    .single()

  if (!asset) return null

  const storagePath = (asset.storage_path as string | null) ?? null

  let url: string | null = null
  if (storagePath) {
    const { data } = supabase.storage.from('visual-assets').getPublicUrl(storagePath)
    url = data?.publicUrl ?? null
  }
  // Fall back to the persisted URL only if no storage path is available.
  url = url ?? (asset.original_url as string | null)
  if (!url) return null

  return {
    url,
    altText: (asset.description as string | null) ?? (asset.name as string | null) ?? null,
    name: (asset.name as string | null) ?? null,
    storagePath,
  }
}
