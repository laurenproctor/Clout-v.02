import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/visual/generation/generateImage'
import type { VisualPlatform, AspectRatio, GenerationMode } from '@/lib/visual/types/visual'

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
  } = body as {
    outputId?:          string
    content?:           string
    platform?:          string
    aspectRatio?:       string
    quality?:           'standard' | 'hd'
    promptOverride?:    string
    emotionalTone?:     string
    keyIdea?:           string
    parentAssetId?:     string
    generationGroupId?: string
    variationReason?:   string
    seed?:              number
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!promptOverride && (!content || !platform)) {
    return NextResponse.json(
      { error: 'Provide either promptOverride, or both content and platform' },
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
    })

    return NextResponse.json(
      {
        assetId:           asset.id,
        url:               asset.originalUrl,
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
