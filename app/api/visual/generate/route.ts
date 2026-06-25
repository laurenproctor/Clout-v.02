import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/visual/generation/generateImage'
import { deriveOverlayCopy, fallbackOverlayCopy } from '@/lib/visual/generation/deriveOverlayCopy'
import { loadGenerationBrandProfile, type GenerationBrandProfile, type BrandProfileSources } from '@/lib/visual/brand/loadGenerationBrandProfile'
import type { VisualPlatform, AspectRatio, GenerationMode, VisualObjective, LensType, OverlayParams } from '@/lib/visual/types/visual'

// ── Rate limiting (in-memory, per-workspace) ─────────────────────────────
type RateBucket = { count: number; windowStart: number }
const standardBuckets = new Map<string, RateBucket>()
const hdBuckets        = new Map<string, RateBucket>()

function isRateLimited(map: Map<string, RateBucket>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const b   = map.get(key)
  if (!b || now - b.windowStart > windowMs) {
    map.set(key, { count: 1, windowStart: now })
    return false
  }
  if (b.count >= max) return true
  b.count++
  return false
}

export const maxDuration = 120 // DALL-E HD can take 45–60s; upload adds more

// Reject a promise that takes too long, so a stalled headline derivation can't
// stall the image job — the caller falls back to deterministic copy.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) },
    )
  })
}

// Map a stored visual_assets row to the same response shape the generate path
// returns, for the idempotency fast-path (existing auto asset → no regeneration).
function rowToVisualResponse(row: Record<string, unknown>) {
  const ctx = (row.generation_context ?? {}) as Record<string, unknown>
  return {
    assetId:           row.id,
    name:              (row.name as string | null) ?? null,
    slug:              (row.slug as string | null) ?? null,
    description:       (row.description as string | null) ?? null,
    url:               (row.composed_url as string | null) ?? (row.original_url as string),
    backgroundUrl:     row.original_url as string,
    composedUrl:       (row.composed_url as string | null) ?? null,
    templateId:        (row.template_id as string | null) ?? null,
    readabilityRating: (ctx.readabilityRating as string | null) ?? null,
    visualIntent:      row.visual_intent ?? null,
    prompt:            row.prompt as string,
    aspectRatio:       row.aspect_ratio as string,
    mode:              row.generation_mode as string,
    generationGroupId: row.generation_group_id as string,
    createdAt:         row.created_at as string,
    idempotent:        true,
  }
}

const VALID_PLATFORMS: VisualPlatform[] = ['linkedin', 'x', 'instagram', 'newsletter', 'blog']
const VALID_RATIOS: AspectRatio[] = ['square', 'landscape', 'portrait']

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    outputId,
    content,
    platform,
    aspectRatio = 'landscape',
    quality = 'standard',
    promptOverride,
    emotionalTone,
    keyIdea,
    parentAssetId,
    generationGroupId,
    variationReason,
    seed,
    visualObjective,
    audienceFrame,
    lensType,
    backgroundMode,
    suppliedBackgroundUrl,
    overlayHeadline,
    overlaySubtext,
    overlayQuote,
    overlayAttribution,
    includeLogo,
    colorScheme,
    overlayStrength,
    textShadow,
    deriveOverlay,
    autoLinkedInImagePost,
  } = body as {
    outputId?:                string
    content?:                 string
    platform?:                string
    aspectRatio?:             string
    quality?:                 'standard' | 'hd'
    promptOverride?:          string
    emotionalTone?:           string
    keyIdea?:                 string
    parentAssetId?:           string
    generationGroupId?:       string
    variationReason?:         string
    seed?:                    number
    visualObjective?:         string
    audienceFrame?:           string
    lensType?:                string
    backgroundMode?:          'generated' | 'uploaded' | 'solid'
    suppliedBackgroundUrl?:   string
    overlayHeadline?:         string
    overlaySubtext?:          string
    overlayQuote?:            string
    overlayAttribution?:      string
    includeLogo?:             boolean
    colorScheme?:             'light' | 'dark' | 'auto'
    overlayStrength?:         'subtle' | 'balanced' | 'strong'
    textShadow?:              'none' | 'light' | 'medium' | 'strong'
    deriveOverlay?:           boolean
    autoLinkedInImagePost?:   boolean   // constrained flag → server derives `purpose`
  }

  // Purpose is server-derived, never trusted from the client. Only a constrained
  // flag is accepted; arbitrary client strings never reach generation_context.
  const purpose: string | undefined = autoLinkedInImagePost ? 'linkedin-image-post-auto' : undefined

  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimited(standardBuckets, session.workspaceId, 10_000, 1)) {
    return NextResponse.json(
      { error: 'Give it a moment before building another direction.' },
      { status: 429 }
    )
  }
  if (quality === 'hd' && isRateLimited(hdBuckets, session.workspaceId, 3_600_000, 5)) {
    return NextResponse.json(
      { error: 'HD generation limit reached. Try again in an hour.' },
      { status: 429 }
    )
  }

  // ── Resolve background mode ───────────────────────────────────────────────
  const resolvedBackgroundMode: 'generated' | 'uploaded' | 'solid' =
    backgroundMode ?? (suppliedBackgroundUrl ? 'uploaded' : 'generated')

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!promptOverride && resolvedBackgroundMode !== 'solid' && !suppliedBackgroundUrl && !overlayHeadline && !overlayQuote && (!content || !platform)) {
    return NextResponse.json(
      { error: 'Provide either promptOverride, suppliedBackgroundUrl, overlayQuote, or both content and platform' },
      { status: 400 }
    )
  }

  if (platform && !VALID_PLATFORMS.includes(platform as VisualPlatform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 })
  }

  if (!VALID_RATIOS.includes(aspectRatio as AspectRatio)) {
    return NextResponse.json({ error: `Invalid aspectRatio: ${aspectRatio}` }, { status: 400 })
  }

  // ── Derive generation mode ────────────────────────────────────────────────
  let mode: GenerationMode
  if (promptOverride) {
    mode = 'prompt-driven'
  } else if (parentAssetId) {
    mode = 'variation'
  } else {
    mode = 'content-derived'
  }

  // ── Verify output ownership (if outputId provided) ────────────────────────
  if (outputId) {
    const supabase = await createClient()
    const { data: output } = await supabase
      .from('outputs')
      .select('workspace_id')
      .eq('id', outputId)
      .single()
    if (!output || output.workspace_id !== session.workspaceId) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 })
    }
  }

  // ── Idempotency fast-path (auto flows) ────────────────────────────────────
  // Before spending a generation, return any existing completed auto asset for
  // this output+purpose. Covers reload, sequential duplicates, and slow-fetch
  // races; the DB unique index (see migration) is the backstop for truly
  // simultaneous requests.
  if (purpose && outputId) {
    const supabase = await createClient()
    // generation_context / composed_url / template_id are Phase-2 columns the
    // generated Supabase types don't model — select('*') returns them at runtime;
    // cast through unknown for the mapper.
    const { data: existing } = await supabase
      .from('visual_assets')
      .select('*')
      .eq('workspace_id', session.workspaceId)
      .eq('output_id', outputId)
      .filter('generation_context->>purpose', 'eq', purpose)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(rowToVisualResponse(existing as unknown as Record<string, unknown>), { status: 200 })
    }
  }

  // ── Derive overlay copy (auto branded-card flow) ──────────────────────────
  // When deriveOverlay is on and the caller didn't supply explicit text, derive a
  // short headline (+ subtext) from the content. AI first, deterministic fallback
  // on failure/timeout — so an auto image always gets branded overlay copy and is
  // never silently downgraded to a plain content-derived image.
  let ovHeadline = overlayHeadline
  let ovSubtext = overlaySubtext
  let overlaySource: 'manual' | 'ai-derived' | 'fallback' = 'manual'

  if (deriveOverlay && !overlayHeadline && !overlayQuote && content) {
    try {
      const d = await withTimeout(deriveOverlayCopy(content), 2_500)
      ovHeadline = d.headline
      ovSubtext = d.subtext
      overlaySource = 'ai-derived'
    } catch {
      const f = fallbackOverlayCopy(content)
      ovHeadline = f.headline
      ovSubtext = f.subtext
      overlaySource = 'fallback'
    }
  }

  // ── Translate overlay strength to numeric opacity ─────────────────────────
  const OVERLAY_OPACITY: Record<string, number> = { subtle: 0.35, balanced: 0.70, strong: 1.00 }
  const overlayOpacity = overlayStrength != null ? OVERLAY_OPACITY[overlayStrength] : undefined

  // ── Resolve overlay params (headline-overlay compositing) ────────────────
  let overlayParams: OverlayParams | undefined

  if (ovHeadline || overlayQuote) {
    const supabase = await createClient()
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('logo_url, logo_url_dark, logo_url_light, primary_color, secondary_color, accent_color, font_heading, font_heading_url, font_body, font_body_url, style_traits')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle()

    // Prefer SVG URLs when available — sharper at 3× DPI.
    function preferSvg(...urls: (string | null | undefined)[]): string | undefined {
      const available = urls.filter((u): u is string => !!u)
      return available.find(u => u.toLowerCase().endsWith('.svg')) ?? available[0]
    }

    // Dark scheme needs a light logo (readable on dark bg); light scheme needs a dark logo.
    const logoUrlLight = preferSvg(brand?.logo_url_light, brand?.logo_url)  // for dark backgrounds
    const logoUrlDark  = preferSvg(brand?.logo_url_dark,  brand?.logo_url)  // for light backgrounds
    const resolvedLogoUrl = colorScheme === 'dark' ? logoUrlLight : logoUrlDark

    // Apply brand text capitalization to overlay content (not attribution — that's a name/credit line).
    const textCap = (brand?.style_traits as Record<string, string> | null)?.text_capitalization
    function cap(text: string | undefined): string | undefined {
      if (!text || !textCap || textCap === 'default') return text
      if (textCap === 'uppercase') return text.toUpperCase()
      if (textCap === 'title') return text.replace(/\b\w/g, c => c.toUpperCase())
      if (textCap === 'sentence') return text.charAt(0).toUpperCase() + text.slice(1)
      return text
    }

    overlayParams = {
      headline:       cap(ovHeadline),
      subtext:        cap(ovSubtext),
      quote:          cap(overlayQuote),
      attribution:    overlayAttribution,
      logoUrl:        includeLogo ? resolvedLogoUrl : undefined,
      logoUrlLight:   includeLogo ? logoUrlLight : undefined,
      logoUrlDark:    includeLogo ? logoUrlDark  : undefined,
      fontHeading:    brand?.font_heading    ?? undefined,
      fontBody:       brand?.font_body       ?? undefined,
      fontHeadingUrl: brand?.font_heading_url ?? undefined,
      fontBodyUrl:    brand?.font_body_url   ?? undefined,
      primaryColor:   brand?.primary_color   ?? undefined,
      secondaryColor: brand?.secondary_color ?? undefined,
      accentColor:    brand?.accent_color    ?? undefined,
      // 'auto' → renderer derives scheme from background luminance; keep 'dark' as the
      // fallback used when brightness can't be measured.
      autoColorScheme: colorScheme === 'auto',
      colorScheme:    colorScheme === 'auto' ? 'dark' : (colorScheme ?? 'light'),
      overlayStrength: overlayStrength,
      overlayOpacity:  overlayOpacity,
      textShadow:      textShadow ?? undefined,
    }
  }

  // ── Load workspace brand profile ──────────────────────────────────────────
  // The profile feeds TWO consumers, so the gate is rendering-need-based, not mode-based:
  //   1. The AI brief (generateVisualIntent) — only for an AI-generated background, and
  //      already skipped internally for prompt-driven.
  //   2. The hybrid-overlay render — brand semantic/style traits whenever text is composited,
  //      regardless of background mode (solid/uploaded) OR generation mode (incl. prompt-driven).
  // Loading it for a prompt-driven image that ALSO has overlay text is correct and harmless.
  const needsBrandProfile =
    resolvedBackgroundMode === 'generated' ||
    Boolean(ovHeadline) ||
    Boolean(overlayQuote)
  let brandProfile: GenerationBrandProfile | undefined
  let brandProfileSources: BrandProfileSources | undefined
  if (needsBrandProfile) {
    const brandClient = await createClient()
    const loaded = await loadGenerationBrandProfile(session.workspaceId, brandClient)
    if (loaded) {
      brandProfile = loaded.profile
      brandProfileSources = loaded.sources
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  try {
    const asset = await generateImage({
      brandProfile,
      brandProfileSources,
      mode,
      workspaceId:        session.workspaceId,
      outputId:           outputId ?? undefined,
      parentAssetId:      parentAssetId ?? undefined,
      generationGroupId:  generationGroupId ?? undefined,
      variationReason:    variationReason ?? undefined,
      content,
      platform:           platform as VisualPlatform | undefined,
      aspectRatio:        aspectRatio as AspectRatio,
      quality,
      emotionalTone,
      keyIdea,
      promptOverride,
      seed,
      visualObjective:         visualObjective as VisualObjective | undefined,
      audienceFrame,
      lensType:                lensType as LensType | undefined,
      backgroundMode:          resolvedBackgroundMode,
      suppliedBackgroundUrl:   suppliedBackgroundUrl ?? undefined,
      overlayParams,
      overlaySource,
      purpose,
    })

    const assetV2 = asset as typeof asset & {
      composedUrl: string | null
      templateId: string | null
      readabilityRating: string | null
    }

    console.info('[visual/generate] generated', {
      workspaceId: session.workspaceId,
      outputId,
      quality,
      mode,
      visualObjective,
      audienceFrame,
      lensType,
    })

    return NextResponse.json(
      {
        assetId:           asset.id,
        name:              asset.name ?? null,
        slug:              asset.slug ?? null,
        description:       asset.description ?? null,
        // composedUrl is the preferred display URL when available (hybrid-overlay);
        // fall back to originalUrl for fully-generated assets.
        url:               assetV2.composedUrl ?? asset.originalUrl,
        backgroundUrl:     asset.originalUrl,
        composedUrl:       assetV2.composedUrl ?? null,
        templateId:        assetV2.templateId ?? null,
        readabilityRating: assetV2.readabilityRating ?? null,
        visualIntent:      asset.visualIntent,
        prompt:            asset.prompt,
        aspectRatio:       asset.aspectRatio,
        mode:              asset.mode,
        generationGroupId: asset.generationGroupId,
        createdAt:         asset.createdAt,
      },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'

    // Surface content policy rejections distinctly (HTTP 422 vs 500)
    if (message.includes('content_policy_violation') || message.includes('safety system')) {
      console.error('[visual/generate] moderation failure', { message, platform, mode })
      return NextResponse.json(
        { error: 'Prompt was rejected by the content policy. Try regenerating or editing the prompt.' },
        { status: 422 }
      )
    }

    console.error('[visual/generate] generation error', { message, platform, mode })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
