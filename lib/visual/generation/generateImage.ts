// lib/visual/generation/generateImage.ts
// Orchestrates the full image generation pipeline.
//
// CRITICAL: This file must NOT contain provider-specific logic or prompt
// engineering. VisualIntent is the communication abstraction. Prompt
// compilation (lib/visual/prompt/) is the provider translation layer.
// All provider-specific behavior lives in lib/visual/providers/.

import { after } from 'next/server'
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
import { normalizeBrandIdentity } from '../brand/normalizeBrandIdentity'
import { loadFontsForSatori } from '../rendering/fonts'
import { renderTemplate } from '../rendering'
import { extractTemplateProps } from './extractTemplateProps'
import { scoreImageQuality, IMAGE_QUALITY_THRESHOLD } from './scoreImageQuality'
import { getPlatformSize } from '../tokens/sizes'
import { trackGeneration, wasLogoRepositioned } from '../telemetry/track'
import type { Json } from '@/types/db'
import type {
  GenerateImageInput,
  OverlayParams,
  VisualAsset,
  VisualIntent,
  VisualPlatform,
} from '../types/visual'
import type { EditorialHeroProps, QuoteMonolithProps, TemplateId, LogoCorner } from '../types/template'

const PUPPETEER_ENABLED = process.env.ENABLE_PUPPETEER_RENDERING === 'true'

const MAX_NAME_LENGTH = 120
const MAX_SLUG_LENGTH = 80
const MAX_DESCRIPTION_LENGTH = 500

const FALLBACK_NAMES: Record<string, string> = {
  'editorial-hero-linkedin':  'LinkedIn Headline Banner',
  'editorial-hero-instagram': 'Instagram Headline Banner',
  'editorial-hero-x':         'X Headline Banner',
  'quote-monolith-linkedin':  'LinkedIn Quote Card',
  'quote-monolith-instagram': 'Instagram Quote Card',
  'quote-monolith-x':         'X Quote Card',
  'editorial-hero':           'Headline Banner',
  'quote-monolith':           'Quote Card',
  'blog':                     'Blog Feature Image',
  'default':                  'Visual Asset',
}

function cleanName(input: string): string {
  return input.replace(/\s+/g, ' ').replace(/[<>:"/\\|?*]+/g, '').trim()
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, MAX_SLUG_LENGTH)
}

function deriveAssetName(opts: {
  overlayParams?: OverlayParams
  resolvedIntent: VisualIntent | null
  keyIdea?: string
  templateId: string | null
  platform?: VisualPlatform
}): string {
  const { overlayParams, resolvedIntent, keyIdea, templateId, platform } = opts

  if (overlayParams?.headline?.trim()) {
    return cleanName(overlayParams.headline.trim().slice(0, MAX_NAME_LENGTH))
  }

  if (overlayParams?.quote?.trim()) {
    const words = overlayParams.quote.trim().split(/\s+/).slice(0, 8).join(' ')
    if (words) return cleanName(words)
  }

  if (keyIdea?.trim()) {
    return cleanName(keyIdea.trim().slice(0, MAX_NAME_LENGTH))
  }

  if (resolvedIntent?.visualConcept?.trim()) {
    return cleanName(resolvedIntent.visualConcept.trim().slice(0, MAX_NAME_LENGTH))
  }

  const key = templateId && platform ? `${templateId}-${platform}` : templateId ?? 'default'
  return FALLBACK_NAMES[key] ?? FALLBACK_NAMES['default']
}

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
    visualObjective,
    audienceFrame,
    lensType,
    visualIntent: intentOverride,
    aspectRatio = 'landscape',
    quality = 'standard',
    seed,
    overlayParams,
  } = input

  const backgroundMode = input.backgroundMode ?? (input.suppliedBackgroundUrl ? 'uploaded' : 'generated')

  // When overlay params include a headline or quote, force the hybrid-overlay path
  // with user's exact text — no Claude extraction.
  // headline → editorial-hero; quote → quote-monolith
  const hasOverlayContent = !!(overlayParams?.headline || overlayParams?.quote)

  const generationGroupId = input.generationGroupId ?? crypto.randomUUID()

  // ── Step 1: Resolve VisualIntent ──────────────────────────────────────────
  let resolvedIntent: VisualIntent | null = null
  let intentInputTokens = 0
  let intentOutputTokens = 0

  if (mode === 'prompt-driven' || promptOverride) {
    resolvedIntent = null
  } else if (intentOverride) {
    resolvedIntent = intentOverride
  } else if (backgroundMode !== 'generated') {
    // Background is user-supplied or solid — no AI image will be generated.
    // Skipping generateVisualIntent saves Anthropic credits and avoids a
    // pipeline failure when credits are exhausted.
    resolvedIntent = null
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
      visualObjective,
      audienceFrame,
      lensType,
    })
    resolvedIntent = result.intent
    intentInputTokens = result.inputTokens
    intentOutputTokens = result.outputTokens
  }

  // ── Step 2: Determine render mode and template ────────────────────────────
  const renderMode = resolvedIntent?.renderMode ?? 'fully-generated'
  // hasOverlayContent forces hybrid-overlay regardless of AI intent decision
  const isHybridOverlay = hasOverlayContent || (renderMode === 'hybrid-overlay' && brandProfile && content)

  let templateId: string | null = null
  let templateSpec = null
  let grammar = null

  if (hasOverlayContent) {
    // Overlay path: quote → quote-monolith; headline → editorial-hero
    templateId = overlayParams?.quote ? 'quote-monolith' : 'editorial-hero'
    templateSpec = getTemplateSpec(templateId as import('../types/template').TemplateId)
  } else if (isHybridOverlay && brandProfile) {
    const archetype = resolveArchetype(brandProfile.brandArchetype)
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
  } else if (!resolvedIntent) {
    // No AI intent (prompt-driven mode or supplied background).
    // Store the overlay text as the reference prompt so the DB row is human-readable.
    finalPrompt = overlayParams?.headline ?? overlayParams?.quote ?? content ?? 'uploaded background'
  } else {
    finalPrompt = buildImagePrompt({
      intent:        resolvedIntent,
      platform,
      aspectRatio,
      styleOverride: brandProfile?.compositionPreference ?? undefined,
      templateSpec:  templateSpec ?? undefined,
      grammar:       grammar ?? undefined,
    })
  }

  // ── Step 4: Pre-generate asset ID ─────────────────────────────────────────
  const assetId = crypto.randomUUID()

  // ── Step 5: Generate background (or use supplied image) ──────────────────
  const provider = getOpenAIProvider()
  let generatedProviderUrl: string | null = null
  let storedPrompt: string = finalPrompt

  if (backgroundMode === 'solid') {
    // No background image — brand surface fills the template.
    storedPrompt = finalPrompt
  } else if (backgroundMode === 'uploaded' && input.suppliedBackgroundUrl) {
    generatedProviderUrl = input.suppliedBackgroundUrl
  } else {
    const generated = await provider.generate({ prompt: finalPrompt, aspectRatio, quality, seed })
    generatedProviderUrl = generated.providerUrl
    storedPrompt = generated.revisedPrompt ?? finalPrompt
  }

  // ── Step 6: Quality scoring for hybrid-overlay ────────────────────────────
  let qualityScore: number | null = null
  let logoCorner: LogoCorner | null = null
  let templateOverrideUsed = false
  let qualityGateTriggered = false

  const ZONE_CONFIDENCE_THRESHOLD = 0.8
  const ZONE_TO_TEMPLATE: Record<string, TemplateId> = {
    'bottom-left': 'editorial-hero',
    'center':      'quote-monolith',
    'right':       'split-panel',
    'upper-left':  'upper-left',
  }

  if (isHybridOverlay && templateSpec && grammar && backgroundMode === 'generated' && generatedProviderUrl !== null) {
    const score = await scoreImageQuality(generatedProviderUrl, grammar, templateSpec)
    qualityScore = score.overall

    // Save originals so the retry path can re-derive decisions against a fresh score.
    const originalTemplateId   = templateId
    const originalTemplateSpec = templateSpec

    // Confidence-gated template override — only switch when the vision model is sure.
    // Not applied in the overlay path: user's content type (headline vs. quote) determines
    // the template there, and that choice is not overridable by vision analysis.
    if (
      !hasOverlayContent &&
      score.openZone &&
      score.openZoneConfidence != null &&
      score.openZoneConfidence >= ZONE_CONFIDENCE_THRESHOLD &&
      ZONE_TO_TEMPLATE[score.openZone] !== templateId
    ) {
      const overrideId = ZONE_TO_TEMPLATE[score.openZone]
      try {
        const overrideSpec = getTemplateSpec(overrideId)
        templateId = overrideId
        templateSpec = overrideSpec
        templateOverrideUsed = true
      } catch {
        // Unknown template — keep original selection
      }
    }

    // Logo placement: pick best corner from template's allowed set
    if (score.logoSafeZone && score.logoVisibilityScore != null && score.logoVisibilityScore >= 0.5) {
      const allowed = templateSpec.allowedLogoCorners
      logoCorner = allowed.includes(score.logoSafeZone) ? score.logoSafeZone : null
    }

    if (score.overall < IMAGE_QUALITY_THRESHOLD) {
      qualityGateTriggered = true
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
      // Score against the original spec — the retry image may suit a different composition
      // zone than whatever the first-pass override selected.
      const retryScore = await scoreImageQuality(retried.providerUrl, grammar, originalTemplateSpec)

      if (retryScore.overall >= score.overall) {
        generatedProviderUrl = retried.providerUrl
        qualityScore = retryScore.overall

        // Re-derive template override and logo placement from the retry image's score.
        // Reset to originals first so this decision is independent of the first pass.
        templateId   = originalTemplateId
        templateSpec = originalTemplateSpec
        templateOverrideUsed = false
        logoCorner   = null

        if (
          !hasOverlayContent &&
          retryScore.openZone &&
          retryScore.openZoneConfidence != null &&
          retryScore.openZoneConfidence >= ZONE_CONFIDENCE_THRESHOLD &&
          ZONE_TO_TEMPLATE[retryScore.openZone] !== templateId
        ) {
          const overrideId = ZONE_TO_TEMPLATE[retryScore.openZone]
          try {
            const overrideSpec = getTemplateSpec(overrideId)
            templateId   = overrideId
            templateSpec = overrideSpec
            templateOverrideUsed = true
          } catch {
            // Unknown template — keep original selection
          }
        }

        if (retryScore.logoSafeZone && retryScore.logoVisibilityScore != null && retryScore.logoVisibilityScore >= 0.5) {
          const allowed = templateSpec.allowedLogoCorners
          logoCorner = allowed.includes(retryScore.logoSafeZone) ? retryScore.logoSafeZone : null
        }
      }
    }
  }

  // ── Step 7: Upload background to Storage ──────────────────────────────────
  const upload = generatedProviderUrl !== null
    ? await uploadImageFromUrl({ providerUrl: generatedProviderUrl, workspaceId, assetId, subfolder: 'backgrounds' })
    : null

  // ── Step 8: Render composed image (hybrid-overlay only) ───────────────────
  let composedUrl: string | null = null
  let composedStoragePath: string | null = null
  let composedFileSizeBytes: number | null = null
  let templatePayload: Record<string, unknown> | null = null

  if (isHybridOverlay && templateSpec && templateId) {
    try {
      const size = getPlatformSize(platform ?? 'blog', aspectRatio)

      if (hasOverlayContent && overlayParams) {
        // ── Overlay path: use user's exact headline/subtext/quote/logo, skip Claude extraction ──
        const overlayTemplateProps: EditorialHeroProps | QuoteMonolithProps = overlayParams.quote
          ? ({
              templateId:     'quote-monolith',
              quote:          overlayParams.quote,
              attribution:    overlayParams.attribution,
              backgroundUrl:  upload?.publicUrl,
              logoUrl:        overlayParams.logoUrl,
              fontHeadingUrl: overlayParams.fontHeadingUrl,
              fontBodyUrl:    overlayParams.fontBodyUrl,
            } satisfies QuoteMonolithProps)
          : ({
              templateId:     'editorial-hero',
              headline:       overlayParams.headline!,
              subtext:        overlayParams.subtext,
              backgroundUrl:  upload?.publicUrl,
              logoUrl:        overlayParams.logoUrl,
              fontHeadingUrl: overlayParams.fontHeadingUrl,
              fontBodyUrl:    overlayParams.fontBodyUrl,
            } satisfies EditorialHeroProps)

        templatePayload = overlayTemplateProps as unknown as Record<string, unknown>

        // Build brand tokens from overlay params; use minimal semantic profile for non-color decisions.
        // colorScheme overrides surface: 'light' forces white surface so text is dark and the
        // gradient panel blends with light backgrounds instead of creating a visible dark box.
        const minimalProfile = normalizeBrandIdentity(null, null)
        const isLightScheme = overlayParams.colorScheme === 'light'
        const brandTokens = buildBrandTokens(
          {
            primaryColor:   isLightScheme ? '#FFFFFF' : (overlayParams.primaryColor ?? '#1A1A1A'),
            secondaryColor: overlayParams.secondaryColor ?? '#FFFFFF',
            accentColor:    overlayParams.accentColor    ?? '#D4A574',
            fontHeading:    overlayParams.fontHeading    ?? 'system-ui',
            fontBody:       overlayParams.fontBody       ?? 'system-ui',
          },
          minimalProfile
        )

        // Puppeteer loads fonts via CSS @font-face in the HTML document; no ArrayBuffer needed.
        // Satori fallback requires pre-loaded font buffers.
        const fonts = PUPPETEER_ENABLED ? [] : await loadFontsForSatori({
          fontHeading:    brandTokens.fontHeading,
          fontBody:       brandTokens.fontBody,
          fontHeadingUrl: overlayParams.fontHeadingUrl ?? undefined,
          fontBodyUrl:    overlayParams.fontBodyUrl    ?? undefined,
        })

        // For Satori: pre-resolve images to data URIs so the renderer never makes
        // outbound network requests. gpt-image-1 already returns base64; use it directly.
        // Puppeteer can load URLs natively so skip this for that path.
        let renderBackgroundUrl: string | undefined = upload?.publicUrl
        let renderLogoUrl: string | undefined = overlayParams.logoUrl

        if (!PUPPETEER_ENABLED && upload?.publicUrl) {
          if (generatedProviderUrl?.startsWith('data:')) {
            renderBackgroundUrl = generatedProviderUrl
          } else {
            try {
              const bgFetch = await fetch(upload.publicUrl)
              if (bgFetch.ok) {
                const bgBuf = Buffer.from(await bgFetch.arrayBuffer())
                const bgMime = (bgFetch.headers.get('content-type') ?? 'image/png').split(';')[0]
                renderBackgroundUrl = `data:${bgMime};base64,${bgBuf.toString('base64')}`
              }
            } catch { /* fall through to public URL */ }
          }
          if (overlayParams.logoUrl) {
            try {
              const logoFetch = await fetch(overlayParams.logoUrl)
              if (logoFetch.ok) {
                const logoBuf = Buffer.from(await logoFetch.arrayBuffer())
                const logoMime = (logoFetch.headers.get('content-type') ?? 'image/png').split(';')[0]
                renderLogoUrl = `data:${logoMime};base64,${logoBuf.toString('base64')}`
              }
            } catch { /* fall through to URL */ }
          }
        }

        const renderProps: EditorialHeroProps | QuoteMonolithProps = overlayParams.quote
          ? ({ ...(overlayTemplateProps as QuoteMonolithProps), backgroundUrl: renderBackgroundUrl, logoUrl: renderLogoUrl })
          : ({ ...(overlayTemplateProps as EditorialHeroProps), backgroundUrl: renderBackgroundUrl, logoUrl: renderLogoUrl })

        const pngBuffer = await renderTemplate(templateSpec, renderProps, brandTokens, size.width, size.height, fonts)
        const composedUpload = await uploadComposedPng({ pngBuffer, workspaceId, assetId })
        composedUrl = composedUpload.publicUrl
        composedStoragePath = composedUpload.storagePath
        composedFileSizeBytes = composedUpload.fileSizeBytes

      } else if (resolvedIntent && content && platform && brandProfile) {
        // ── Brand profile path: Claude extracts template props from content ──
        const templateProps = await extractTemplateProps(
          templateSpec.id,
          content,
          resolvedIntent,
          upload?.publicUrl ?? ''
        )
        templatePayload = templateProps as unknown as Record<string, unknown>

        const brandRaw = brandProfile as unknown as Record<string, unknown>
        const brandTokens = buildBrandTokens(
          {
            primaryColor:   String(brandRaw.primaryColor   ?? '#1A1A1A'),
            secondaryColor: String(brandRaw.secondaryColor ?? '#FFFFFF'),
            accentColor:    String(brandRaw.accentColor    ?? '#D4A574'),
            fontHeading:    brandProfile.imageryType ? String(brandRaw.fontHeading ?? 'system-ui') : 'system-ui',
            fontBody:       String(brandRaw.fontBody ?? 'system-ui'),
            styleTrait_borderRadius: String((brandRaw.styleTrait_borderRadius ?? 'balanced')),
          },
          brandProfile
        )

        const fonts = await loadFontsForSatori({
          fontHeading:    brandTokens.fontHeading,
          fontBody:       brandTokens.fontBody,
          fontHeadingUrl: String(brandRaw.fontHeadingUrl ?? '') || undefined,
          fontBodyUrl:    String(brandRaw.fontBodyUrl    ?? '') || undefined,
        })

        const pngBuffer = await renderTemplate(templateSpec, templateProps, brandTokens, size.width, size.height, fonts)
        const composedUpload = await uploadComposedPng({ pngBuffer, workspaceId, assetId })
        composedUrl = composedUpload.publicUrl
        composedStoragePath = composedUpload.storagePath
        composedFileSizeBytes = composedUpload.fileSizeBytes
      }

    } catch (err) {
      // Composition failure should not fail the entire generation —
      // fall back to the background-only image gracefully.
      console.error('[visual/generateImage] composition failed — falling back to background only', err)
    }
  }

  // ── Step 9: Persist to visual_assets ──────────────────────────────────────
  // For solid-color cards, the composed PNG is the primary artifact.
  // Publishing (publishing.ts) and gallery (visuals-tab.tsx) both read original_url,
  // so it must always be a valid image URL — the composed card itself.
  const primaryUrl    = backgroundMode === 'solid' ? composedUrl          : upload?.publicUrl
  const primaryPath   = backgroundMode === 'solid' ? composedStoragePath  : upload?.storagePath
  const primaryMime   = backgroundMode === 'solid' ? 'image/png'          : upload?.mimeType
  const primarySize   = backgroundMode === 'solid' ? composedFileSizeBytes : upload?.fileSizeBytes

  const supabase = await createClient()

  const assetName = deriveAssetName({ overlayParams, resolvedIntent, keyIdea, templateId, platform })
  const assetSlug = slugify(assetName)
  const assetDescription = resolvedIntent?.visualConcept?.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null

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
    original_url:         primaryUrl   ?? '',
    storage_path:         primaryPath  ?? '',
    prompt:               storedPrompt,
    visual_intent:        resolvedIntent as unknown as Json | null,
    generation_mode:      mode,
    render_mode:          renderMode,
    aspect_ratio:         aspectRatio,
    mime_type:            primaryMime  ?? 'image/png',
    file_size_bytes:      primarySize  ?? 0,
    seed:                 seed ?? null,
    status:               'completed' as const,
    intent_input_tokens:  intentInputTokens || null,
    intent_output_tokens: intentOutputTokens || null,
    template_id:          templateId,
    composed_url:         composedUrl,
    template_payload:     templatePayload as unknown as Json | null,
    quality_score:        qualityScore,
    name:                 assetName,
    slug:                 assetSlug,
    description:          assetDescription,
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

  // Fire telemetry after response — never blocks the caller
  const defaultLogoCorner = templateSpec?.allowedLogoCorners[0] ?? null
  after(trackGeneration({
    imageId:               row.id,
    workspaceId,
    templateId,
    qualityScore,
    openZone:              null,     // populated by scoreImageQuality run; not surfaced here yet
    openZoneConfidence:    null,
    logoVisibilityScore:   null,
    templateOverrideUsed,
    logoRepositioned:      wasLogoRepositioned(logoCorner, defaultLogoCorner as LogoCorner),
    qualityGateTriggered,
    regenerationRequested: qualityGateTriggered,
    rejectionReason:       null,
  }))

  return {
    id:               row.id,
    name:             row.name ?? assetName,
    slug:             row.slug ?? assetSlug,
    description:      row.description ?? assetDescription,
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
