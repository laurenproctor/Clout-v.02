import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { checkGenerationLimit } from '@/lib/auth/entitlements'
import { getCapture } from '@/lib/domain/capture'
import { getLensById } from '@/lib/domain/lens'
import { callClaude, buildGenerationSystemPrompt } from '@/lib/ai/generate'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { capture_id, lens_id } = body
  const channelId = body.channel_id ?? null

  if (!capture_id || !lens_id) {
    return NextResponse.json(
      { error: 'capture_id and lens_id are required' },
      { status: 400 }
    )
  }

  // Load capture
  const captureResult = await getCapture(capture_id)
  if (!captureResult.ok) {
    return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
  }
  const capture = captureResult.data
  if (capture.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Load lens
  const lensResult = await getLensById(lens_id)
  if (!lensResult.ok) {
    return NextResponse.json({ error: 'Lens not found' }, { status: 404 })
  }
  const lens = lensResult.data

  // Load profile for context
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, tone_notes, mental_models, philosophies, target_audiences, sample_content')
    .eq('workspace_id', session.workspaceId)
    .single()

  // Load channel config if specified
  let channelConfig: { platform: string; config: Record<string, unknown> } | null = null

  if (channelId) {
    const { data: channel } = await supabase
      .from('channels')
      .select('platform, config')
      .eq('id', channelId)
      .single()

    if (channel) {
      channelConfig = {
        platform: channel.platform as string,
        config: channel.config as Record<string, unknown>,
      }
    }
  }

  const profileContext = {
    displayName: profile?.display_name ?? null,
    toneNotes: profile?.tone_notes ?? null,
    mentalModels: (profile?.mental_models as Array<{ name: string; description: string }>) ?? [],
    philosophies: (profile?.philosophies as Array<{ name: string; description: string }>) ?? [],
    targetAudiences: (profile?.target_audiences as string[]) ?? [],
    sampleContent: (profile?.sample_content as string[]) ?? [],
    channelConfig,
  }

  // Build prompt
  const systemPrompt = buildGenerationSystemPrompt({
    lensSystemPrompt: lens.systemPrompt,
    profileContext,
  })
  const userMessage = capture.transcript ?? capture.rawContent ?? ''

  if (!userMessage.trim()) {
    return NextResponse.json({ error: 'Capture has no content to generate from' }, { status: 400 })
  }

  // Check generation limit
  const genLimit = await checkGenerationLimit(session.workspaceId)
  if (!genLimit.allowed) {
    return NextResponse.json(
      {
        error: `Monthly generation limit reached (${genLimit.used}/${genLimit.limit}). Upgrade your plan for more generations.`,
        code: 'GENERATION_LIMIT_EXCEEDED',
      },
      { status: 402 }
    )
  }

  // Create generation record
  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      workspace_id: session.workspaceId,
      capture_id: capture.id,
      lens_id: lens.id,
      profile_id: profile?.id ?? session.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: systemPrompt,
    })
    .select()
    .single()

  if (genError || !generation) {
    return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 })
  }

  // Call Claude
  let aiResult
  try {
    aiResult = await callClaude({
      systemPrompt,
      userMessage,
      model: 'claude-sonnet-4-6',
    })
  } catch (err) {
    await supabase
      .from('generations')
      .update({ status: 'failed', error_message: String(err) })
      .eq('id', generation.id)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  // Parse response — expect JSON, fall back to raw text
  let content: Record<string, unknown>
  try {
    const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/)
    content = jsonMatch ? JSON.parse(jsonMatch[0]) : { body: aiResult.content }
  } catch {
    content = { body: aiResult.content }
  }

  // Update generation to complete
  await supabase
    .from('generations')
    .update({
      status: 'complete',
      raw_response: aiResult.content,
      duration_ms: aiResult.durationMs,
      token_count: aiResult.inputTokens + aiResult.outputTokens,
      completed_at: new Date().toISOString(),
    })
    .eq('id', generation.id)

  // Create output
  const { data: output, error: outputError } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      generation_id: generation.id,
      status: 'draft',
      title: typeof content.hook === 'string' ? content.hook.slice(0, 120) : null,
      content: content as import('@/types/db').Json,
    })
    .select()
    .single()

  if (outputError || !output) {
    return NextResponse.json({ error: 'Failed to create output' }, { status: 500 })
  }

  return NextResponse.json(
    { output_id: output.id, generation_id: generation.id },
    { status: 201 }
  )
}
