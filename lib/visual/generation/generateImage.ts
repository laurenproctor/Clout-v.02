// lib/visual/generation/generateImage.ts
// Orchestrates the full image generation pipeline.
//
// CRITICAL: This file must NOT contain provider-specific logic or prompt
// engineering. VisualIntent is the communication abstraction. Prompt
// compilation (lib/visual/prompt/) is the provider translation layer.
// All provider-specific behavior lives in lib/visual/providers/.

import { generateVisualIntent } from './generateVisualIntent'
import { buildImagePrompt } from '../prompt'
import { getOpenAIProvider } from '../providers/openai'
import { uploadImageFromUrl } from '../storage/uploadImage'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/db'
import type {
  GenerateImageInput,
  VisualAsset,
  VisualIntent,
} from '../types/visual'

export async function generateImage(input: GenerateImageInput): Promise<VisualAsset> {
  const {
    mode,
    workspaceId,
    outputId,
    parentAssetId,
    variationReason,
    content,
    platform,
    emotionalTone,
    keyIdea,
    brandProfile,
    promptOverride,
    visualIntent: intentOverride,
    aspectRatio = 'landscape',
    quality = 'standard',
    seed,
  } = input

  // Every asset must belong to a lineage group — auto-generate if not provided
  const generationGroupId = input.generationGroupId ?? crypto.randomUUID()

  // ── Step 1: Resolve VisualIntent ──────────────────────────────────────────
  let resolvedIntent: VisualIntent | null = null
  let intentInputTokens = 0
  let intentOutputTokens = 0

  if (mode === 'prompt-driven' || promptOverride) {
    // Caller provided a raw prompt — skip Claude intent generation entirely
    resolvedIntent = null
  } else if (intentOverride) {
    // Caller already has an intent (e.g., from a prior call or a cached result)
    resolvedIntent = intentOverride
  } else {
    // Generate intent from content + platform context
    if (!content || !platform) {
      throw new Error(
        'content and platform are required for content-derived generation'
      )
    }
    const result = await generateVisualIntent({
      content,
      platform,
      emotionalTone,
      keyIdea,
      brandProfile,
    })
    resolvedIntent = result.intent
    intentInputTokens = result.inputTokens
    intentOutputTokens = result.outputTokens
  }

  // ── Step 2: Compile the final prompt ──────────────────────────────────────
  let finalPrompt: string
  if (promptOverride) {
    finalPrompt = promptOverride
  } else {
    finalPrompt = buildImagePrompt({
      intent:        resolvedIntent!,
      platform,
      aspectRatio,
      styleOverride: brandProfile?.compositionPreference ?? undefined,
    })
  }

  // ── Step 3: Call the provider ─────────────────────────────────────────────
  const provider = getOpenAIProvider()
  const generated = await provider.generate({ prompt: finalPrompt, aspectRatio, quality, seed })

  // Use revised_prompt as the canonical stored prompt — it's what was rendered
  const storedPrompt = generated.revisedPrompt ?? finalPrompt

  // ── Step 4: Pre-generate asset ID (used for storage path AND DB PK) ───────
  const assetId = crypto.randomUUID()

  // ── Step 5: Upload to Supabase Storage ────────────────────────────────────
  const upload = await uploadImageFromUrl({
    providerUrl: generated.providerUrl,
    workspaceId,
    assetId,
  })

  // ── Step 6: Persist to visual_assets ─────────────────────────────────────
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('visual_assets')
    .insert({
      id:                   assetId,
      workspace_id:         workspaceId,
      output_id:            outputId ?? null,
      parent_asset_id:      parentAssetId ?? null,
      generation_group_id:  generationGroupId,
      variation_reason:     variationReason ?? null,
      provider:             'openai',
      provider_model:       'dall-e-3',
      original_url:         upload.publicUrl,
      storage_path:         upload.storagePath,
      prompt:               storedPrompt,
      visual_intent:        resolvedIntent as unknown as Json | null,
      generation_mode:      mode,
      render_mode:          resolvedIntent?.renderMode ?? 'fully-generated',
      aspect_ratio:         aspectRatio,
      mime_type:            upload.mimeType,
      file_size_bytes:      upload.fileSizeBytes,
      seed:                 seed ?? null,
      status:               'completed',
      intent_input_tokens:  intentInputTokens || null,
      intent_output_tokens: intentOutputTokens || null,
    })
    .select()
    .single()

  if (error || !row) {
    console.error('[visual/generateImage] DB insert failed', { error: error?.message, assetId })
    throw new Error(`Failed to persist visual asset: ${error?.message}`)
  }

  console.log('[visual/generateImage] asset created', {
    assetId,
    mode,
    aspectRatio,
    fileSizeBytes: upload.fileSizeBytes,
    intentInputTokens,
    intentOutputTokens,
  })

  return {
    id:               row.id,
    workspaceId:      row.workspace_id,
    outputId:         row.output_id,
    parentAssetId:    row.parent_asset_id,
    generationGroupId: row.generation_group_id,
    variationReason:  row.variation_reason,
    provider:         'openai',
    providerModel:    row.provider_model,
    originalUrl:      row.original_url,
    prompt:           row.prompt,
    visualIntent:     resolvedIntent,
    mode:             row.generation_mode as GenerateImageInput['mode'],
    renderMode:       row.render_mode as VisualAsset['renderMode'],
    aspectRatio:      row.aspect_ratio as VisualAsset['aspectRatio'],
    mimeType:         row.mime_type,
    fileSizeBytes:    row.file_size_bytes,
    seed:             row.seed,
    status:           row.status as VisualAsset['status'],
    createdAt:        row.created_at,
  }
}
