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
import { uploadComposedPng } from '../storage/uploadComposed'
import { createClient } from '@/lib/supabase/server'
import { resolveArchetype } from '../grammar/archetypeGrammar'
import { ARCHETYPE_GRAMMAR } from '../grammar/archetypeGrammar'
import { selectTemplate, inferContentType } from '../templates/selector'
import { getTemplateSpec } from '../templates/registry'
import { buildBrandTokens } from '../brand/buildBrandTokens'
import { loadFontsForSatori } from '../rendering/fonts'
import { renderTemplate } from '../rendering'
import { extractTemplateProps } from './extractTemplateProps'
import { scoreImageQuality, IMAGE_QUALITY_THRESHOLD } from './scoreImageQuality'
import { getPlatformSize } from '../tokens/sizes'
import type { Json } from '@/types/db'
import type {
  GenerateImageInput,
  VisualAsset,
  VisualIntent,
} from '../types/visual'

// Extended VisualAsset with Phase 2 fields
export interface VisualAssetV2 extends VisualAsset {
  templateId: string | null
  composedUrl: string | null
  templatePayload: Record<string, unknown> | null
  qualityScore: number | null
}

export async function generateImage(input: GenerateImageInput): Promise<VisualAssetV2> {
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

  const generationGroupId = input.generationGroupId ?? crypto.randomUUID()

  // ── Step 1: Resolve VisualIntent ──────────────────────────────────────────
  let resolvedIntent: VisualIntent | null = null
  let intentInputTokens = 0
  let intentOutputTokens = 0

  if (mode === 'prompt-driven' || promptOverride) {
    resolvedIntent = null
  } else if (intentOverride) {
    resolvedIntent = intentOverride
  } else {
    if (!content || !platform) {
      throw new Error('content and platform are required for content-derived generation')
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

  // ── Step 2: Determine render mode and template ────────────────────────────
  const renderMode = resolvedIntent?.renderMode ?? 'fully-generated'
  const isHybridOverlay = renderMode === 'hybrid-overlay' && brandProfile && content

  let templateId: string | null = null
  let templateSpec = null
  let grammar = null

  if (isHybridOverlay) {
    const archetype = resolveArchetype(brandProfile!.brandArchetype)
    grammar = ARCHETYPE_GRAMMAR[archetype]
    const contentType = inferContentType(content!)

    // Check for Signature Mode: brand_profiles.signature_template_id
    // (passed through brandProfile extension — populated by generateImage callers that query brand_profiles)
    const brandRawForSig = brandProfile as unknown as Record<string, unknown>
    const signatureId = brandRawForSig?.signatureTemplateId as string | null | undefined

    const selectedTemplateId = selectTemplate(archetype, contentType, (signatureId ?? null) as import('../types/template').TemplateId | null)
    templateId = selectedTemplateId
    templateSpec = getTemplateSpec(selectedTemplateId)
  }

  // ── Step 3: Compile the background prompt ─────────────────────────────────
  let finalPrompt: string
  if (promptOverride) {
    finalPrompt = promptOverride
  } else {
    finalPrompt = buildImagePrompt({
      intent:        resolvedIntent!,
      platform,
      aspectRatio,
      styleOverride: brandProfile?.compositionPreference ?? undefined,
      templateSpec:  templateSpec ?? undefined,
      grammar:       grammar ?? undefined,
    })
  }

  // ── Step 4: Pre-generate asset ID ─────────────────────────────────────────
  const assetId = crypto.randomUUID()

  // ── Step 5: Generate background ───────────────────────────────────────────
  const provider = getOpenAIProvider()
  const generated = await provider.generate({ prompt: finalPrompt, aspectRatio, quality, seed })
  const storedPrompt = generated.revisedPrompt ?? finalPrompt

  // ── Step 6: Quality scoring for hybrid-overlay ────────────────────────────
  let qualityScore: number | null = null

  if (isHybridOverlay && templateSpec && grammar) {
    const score = await scoreImageQuality(generated.providerUrl, grammar, templateSpec)
    qualityScore = score.overall

    if (score.overall < IMAGE_QUALITY_THRESHOLD) {
      // One retry with stricter exclusions
      const stricterGrammar = {
        ...grammar,
        visualExclusions: [
          ...grammar.visualExclusions,
          'busy foreground', 'high detail lower-left', 'centered subject',
        ],
      }
      const retriedPrompt = buildImagePrompt({
        intent:       resolvedIntent!,
        platform,
        aspectRatio,
        styleOverride: brandProfile?.compositionPreference ?? undefined,
        templateSpec,
        grammar: stricterGrammar,
      })
      const retried = await provider.generate({ prompt: retriedPrompt, aspectRatio, quality })
      const retryScore = await scoreImageQuality(retried.providerUrl, grammar, templateSpec)

      if (retryScore.overall >= score.overall) {
        // Use the retry result if it's better
        Object.assign(generated, retried)
        qualityScore = retryScore.overall
      }
    }
  }

  // ── Step 7: Upload background to Storage ──────────────────────────────────
  const upload = await uploadImageFromUrl({
    providerUrl: generated.providerUrl,
    workspaceId,
    assetId,
    subfolder: 'backgrounds',
  })

  // ── Step 8: Render composed image (hybrid-overlay only) ───────────────────
  let composedUrl: string | null = null
  let templatePayload: Record<string, unknown> | null = null

  if (isHybridOverlay && templateSpec && templateId && resolvedIntent && content && platform) {
    try {
      const size = getPlatformSize(platform, aspectRatio)

      const templateProps = await extractTemplateProps(
        templateSpec.id,
        content,
        resolvedIntent,
        upload.publicUrl
      )
      templatePayload = templateProps as unknown as Record<string, unknown>

      const brandRaw = brandProfile as unknown as Record<string, unknown>
      const brandTokens = buildBrandTokens(
        {
          primaryColor:   String(brandRaw.primaryColor   ?? '#1A1A1A'),
          secondaryColor: String(brandRaw.secondaryColor ?? '#FFFFFF'),
          accentColor:    String(brandRaw.accentColor    ?? '#D4A574'),
          fontHeading:    brandProfile!.imageryType ? String(brandRaw.fontHeading ?? 'system-ui') : 'system-ui',
          fontBody:       String(brandRaw.fontBody ?? 'system-ui'),
          styleTrait_borderRadius: String((brandRaw.styleTrait_borderRadius ?? 'balanced')),
        },
        brandProfile!
      )

      const fonts = await loadFontsForSatori({
        fontHeading:    brandTokens.fontHeading,
        fontBody:       brandTokens.fontBody,
        fontHeadingUrl: String(brandRaw.fontHeadingUrl ?? '') || undefined,
        fontBodyUrl:    String(brandRaw.fontBodyUrl    ?? '') || undefined,
      })

      const pngBuffer = await renderTemplate(
        templateSpec,
        templateProps,
        brandTokens,
        size.width,
        size.height,
        fonts
      )

      const composedUpload = await uploadComposedPng({ pngBuffer, workspaceId, assetId })
      composedUrl = composedUpload.publicUrl

    } catch (err) {
      // Composition failure should not fail the entire generation —
      // fall back to the background-only image gracefully.
      console.error('[visual/generateImage] composition failed — falling back to background only', err)
    }
  }

  // ── Step 9: Persist to visual_assets ──────────────────────────────────────
  const supabase = await createClient()
  // Cast through unknown to accommodate Phase 2 columns (template_id, composed_url, etc.)
  // that exist in the DB via migration but may not yet be in the generated Supabase types.
  const insertPayload = {
    workspace_id:         workspaceId,
    output_id:            outputId ?? null,
    parent_asset_id:      parentAssetId ?? null,
    generation_group_id:  generationGroupId,
    variation_reason:     variationReason ?? null,
    provider:             'openai' as const,
    provider_model:       'gpt-image-1',
    original_url:         upload.publicUrl,
    storage_path:         upload.storagePath,
    prompt:               storedPrompt,
    visual_intent:        resolvedIntent as unknown as Json | null,
    generation_mode:      mode,
    render_mode:          renderMode,
    aspect_ratio:         aspectRatio,
    mime_type:            upload.mimeType,
    file_size_bytes:      upload.fileSizeBytes,
    seed:                 seed ?? null,
    status:               'completed' as const,
    intent_input_tokens:  intentInputTokens || null,
    intent_output_tokens: intentOutputTokens || null,
    template_id:          templateId,
    composed_url:         composedUrl,
    template_payload:     templatePayload as unknown as Json | null,
    quality_score:        qualityScore,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await supabase
    .from('visual_assets')
    .insert(insertPayload as any)
    .select()
    .single()

  if (error || !row) {
    console.error('[visual/generateImage] DB insert failed', { error: error?.message, assetId })
    throw new Error(`Failed to persist visual asset: ${error?.message}`)
  }

  console.log('[visual/generateImage] asset created', {
    assetId,
    mode,
    renderMode,
    templateId,
    composedUrl: composedUrl ? 'yes' : 'no',
    qualityScore,
    aspectRatio,
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
    // Phase 2 fields
    templateId:      (row as Record<string, unknown>).template_id as string | null,
    composedUrl:     (row as Record<string, unknown>).composed_url as string | null,
    templatePayload: (row as Record<string, unknown>).template_payload as Record<string, unknown> | null,
    qualityScore:    (row as Record<string, unknown>).quality_score as number | null,
  }
}
