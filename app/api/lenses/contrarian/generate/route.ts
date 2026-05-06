import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { checkGenerationLimit } from '@/lib/auth/entitlements'
import { getCapture } from '@/lib/domain/capture'
import { createClient } from '@/lib/supabase/server'
import { generateContrarian } from '@/lib/lenses/contrarian/contrarianLens'
import { CONTRARIAN_CONTENT_TYPE } from '@/lib/lenses/contrarian/contrarianTypes'
import type { Json } from '@/types/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { capture_id } = body as { capture_id?: string }
  const t0 = Date.now()

  if (!capture_id) {
    return NextResponse.json({ error: 'capture_id is required' }, { status: 400 })
  }

  const captureResult = await getCapture(capture_id)
  if (!captureResult.ok) {
    return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
  }
  const capture = captureResult.data
  if (capture.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const captureContent = capture.transcript ?? capture.rawContent ?? ''
  if (!captureContent.trim()) {
    return NextResponse.json({ error: 'Capture has no content to analyze' }, { status: 400 })
  }

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

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('workspace_id', session.workspaceId)
    .single()

  const { data: allSystemLenses } = await supabase
    .from('lenses')
    .select('id, lens_type')
    .is('workspace_id', null)
    .eq('is_active', true)
    .is('deleted_at', null)

  const contrarianLensRow = (allSystemLenses as Array<{ id: string; lens_type: string | null }> | null)
    ?.find((l) => l.lens_type === 'contrarian') ?? null

  if (!contrarianLensRow) {
    return NextResponse.json(
      { error: 'Contrarian Lens not configured. Run the migration to seed it.' },
      { status: 500 }
    )
  }

  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      workspace_id: session.workspaceId,
      capture_id: capture.id,
      lens_id: contrarianLensRow.id,
      profile_id: profile?.id ?? session.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: 'contrarian-lens-v1',
    })
    .select()
    .single()

  if (genError || !generation) {
    return NextResponse.json({ error: 'Failed to create generation record' }, { status: 500 })
  }

  let contrarianOutput
  try {
    contrarianOutput = await generateContrarian({ captureContent })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/lenses/contrarian/generate] pipeline error', { capture_id, error: message })

    await supabase
      .from('generations')
      .update({ status: 'failed', error_message: message })
      .eq('id', generation.id)

    return NextResponse.json({ error: 'Contrarian generation failed' }, { status: 500 })
  }

  await supabase
    .from('generations')
    .update({
      status: 'complete',
      raw_response: JSON.stringify(contrarianOutput),
      duration_ms: contrarianOutput.generationMetadata.durationMs,
      token_count:
        contrarianOutput.generationMetadata.inputTokens +
        contrarianOutput.generationMetadata.outputTokens,
      completed_at: new Date().toISOString(),
    })
    .eq('id', generation.id)

  const { data: output, error: outputError } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      generation_id: generation.id,
      content_type: CONTRARIAN_CONTENT_TYPE,
      status: 'draft',
      title: `Contrarian Analysis`,
      content: contrarianOutput as unknown as Json,
    })
    .select()
    .single()

  if (outputError || !output) {
    return NextResponse.json({ error: 'Failed to store output' }, { status: 500 })
  }

  console.log('[api/lenses/contrarian/generate] success', {
    output_id: output.id,
    generation_id: generation.id,
    contrarian_score: contrarianOutput.contrarianScore,
    hidden_assumptions: contrarianOutput.hiddenAssumptions.length,
    second_order_effects: contrarianOutput.secondOrderEffects.length,
    duration_ms: Date.now() - t0,
  })

  return NextResponse.json(
    {
      output_id: output.id,
      contrarian: contrarianOutput,
    },
    { status: 201 }
  )
}
