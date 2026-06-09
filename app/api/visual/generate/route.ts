import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/visual/generation/generateImage'
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
    suppliedBackgroundUrl,
    overlayHeadline,
    overlaySubtext,
    overlayQuote,
    overlayAttribution,
    includeLogo,
    colorScheme,
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
    suppliedBackgroundUrl?:   string
    overlayHeadline?:         string
    overlaySubtext?:          string
    overlayQuote?:            string
    overlayAttribution?:      string
    includeLogo?:             boolean
    colorScheme?:             'light' | 'dark'
  }

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

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!promptOverride && !suppliedBackgroundUrl && !overlayQuote && (!content || !platform)) {
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

  // ── Resolve overlay params (headline-overlay compositing) ────────────────
  let overlayParams: OverlayParams | undefined

  if (overlayHeadline || overlayQuote) {
    const supabase = await createClient()
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('logo_url, logo_url_dark, logo_url_light, primary_color, secondary_color, accent_color, font_heading, font_heading_url, font_body, font_body_url')
      .eq('workspace_id', session.workspaceId)
      .maybeSingle()

    // Prefer SVG URLs when available — sharper at 3× DPI.
    function preferSvg(...urls: (string | null | undefined)[]): string | undefined {
      const available = urls.filter((u): u is string => !!u)
      return available.find(u => u.toLowerCase().endsWith('.svg')) ?? available[0]
    }

    // Dark scheme needs a light logo (readable on dark bg); light scheme needs a dark logo.
    const resolvedLogoUrl = colorScheme === 'dark'
      ? preferSvg(brand?.logo_url_light, brand?.logo_url)
      : preferSvg(brand?.logo_url_dark, brand?.logo_url)

    overlayParams = {
      headline:       overlayHeadline,
      subtext:        overlaySubtext,
      quote:          overlayQuote,
      attribution:    overlayAttribution,
      logoUrl:        includeLogo ? resolvedLogoUrl : undefined,
      fontHeading:    brand?.font_heading    ?? undefined,
      fontBody:       brand?.font_body       ?? undefined,
      fontHeadingUrl: brand?.font_heading_url ?? undefined,
      fontBodyUrl:    brand?.font_body_url   ?? undefined,
      primaryColor:   brand?.primary_color   ?? undefined,
      secondaryColor: brand?.secondary_color ?? undefined,
      accentColor:    brand?.accent_color    ?? undefined,
      colorScheme:    colorScheme ?? 'light',
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  try {
    const asset = await generateImage({
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
      suppliedBackgroundUrl:   suppliedBackgroundUrl ?? undefined,
      overlayParams,
    })

    const assetV2 = asset as typeof asset & {
      composedUrl: string | null
      templateId: string | null
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
        // composedUrl is the preferred display URL when available (hybrid-overlay);
        // fall back to originalUrl for fully-generated assets.
        url:               assetV2.composedUrl ?? asset.originalUrl,
        backgroundUrl:     asset.originalUrl,
        composedUrl:       assetV2.composedUrl ?? null,
        templateId:        assetV2.templateId ?? null,
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
