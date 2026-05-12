// lib/visual/storage/uploadImage.ts
// Downloads an ephemeral provider URL and uploads to Supabase 'visual-assets' bucket.
// Pattern mirrors app/api/brand/logo/route.ts:23–32.
//
// TODO: Garbage collect visual_assets rows where selectedVisualAssetId is never set
// (i.e., generated but never attached to published content) after X days.
// Without lifecycle management, experimentation creates permanent asset bloat.

import { createClient } from '@/lib/supabase/server'

const BUCKET = 'visual-assets'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export interface UploadResult {
  publicUrl: string
  storagePath: string  // needed for storage.remove() — not derivable from public URL
  mimeType: string
  fileSizeBytes: number
}

export async function uploadImageFromUrl(params: {
  providerUrl: string
  workspaceId: string
  assetId: string      // pre-generated UUID; becomes the storage filename
  subfolder?: string   // optional subfolder, e.g. 'backgrounds' for hybrid-overlay
}): Promise<UploadResult> {
  const { providerUrl, workspaceId, assetId, subfolder } = params

  // Fetch ephemeral image from provider
  const imageRes = await fetch(providerUrl)
  if (!imageRes.ok) {
    const msg = `Failed to fetch image from provider: HTTP ${imageRes.status}`
    console.error('[visual/storage] fetch error', { status: imageRes.status, providerUrl })
    throw new Error(msg)
  }

  const arrayBuffer = await imageRes.arrayBuffer()

  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new Error(`Image exceeds ${MAX_BYTES / 1024 / 1024} MB limit`)
  }

  // Resolve MIME type from Content-Type header
  const contentType = imageRes.headers.get('content-type') ?? 'image/png'
  const mimeType = contentType.split(';')[0].trim()

  const extMap: Record<string, string> = {
    'image/png':  'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  const ext = extMap[mimeType] ?? 'png'

  // Phase 2: background images stored under backgrounds/ subfolder.
  // Existing Phase 1 assets keep their root-level paths unchanged.
  const storagePath = subfolder
    ? `${workspaceId}/${subfolder}/${assetId}.${ext}`
    : `${workspaceId}/${assetId}.${ext}`

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false, // assetId is a fresh UUID — collision is impossible
    })

  if (uploadError) {
    console.error('[visual/storage] upload error', { message: uploadError.message, storagePath })
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  return {
    publicUrl,
    storagePath,
    mimeType,
    fileSizeBytes: arrayBuffer.byteLength,
  }
}
