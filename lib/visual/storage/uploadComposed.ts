// lib/visual/storage/uploadComposed.ts
// Uploads the final composed PNG (background + React typography) to Supabase Storage.
// Path: {workspaceId}/composed/{assetId}.png
// The assetId is shared with the background image — they are always paired.

import { createClient } from '@/lib/supabase/server'

const BUCKET = 'visual-assets'

export interface ComposedUploadResult {
  publicUrl: string
  storagePath: string
  fileSizeBytes: number
}

export async function uploadComposedPng(params: {
  pngBuffer: Buffer
  workspaceId: string
  assetId: string
}): Promise<ComposedUploadResult> {
  const { pngBuffer, workspaceId, assetId } = params

  const storagePath = `${workspaceId}/composed/${assetId}.png`

  const supabase = await createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, pngBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) {
    console.error('[visual/storage] uploadComposed error', { message: error.message, storagePath })
    throw new Error(`Composed upload failed: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  return {
    publicUrl,
    storagePath,
    fileSizeBytes: pngBuffer.byteLength,
  }
}
