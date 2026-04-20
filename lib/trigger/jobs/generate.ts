import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'
import { callClaude, buildGenerationSystemPrompt } from '@/lib/ai/generate'

export const generateJob = task({
  id: 'generate-output',
  retry: { maxAttempts: 2 },
  run: async (payload: { generation_id: string }) => {
    const { generation_id } = payload
    const supabase = createServiceClient()

    await logger.info('Starting generation', { generation_id })

    // Load generation record
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('*, captures(*), lenses(*), profiles(*)')
      .eq('id', generation_id)
      .single()

    if (genError || !generation) {
      await logger.error('Generation not found', { generation_id })
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gen = generation as any
    const capture = gen.captures as Record<string, unknown>
    const lens = gen.lenses as Record<string, unknown>
    const profile = gen.profiles as Record<string, unknown> | null

    const userMessage = (capture?.transcript ?? capture?.raw_content ?? '') as string
    if (!userMessage.trim()) {
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: 'Capture has no content' })
        .eq('id', generation_id)
      return
    }

    const systemPrompt = buildGenerationSystemPrompt({
      lensSystemPrompt: lens.system_prompt as string,
      profileContext: {
        displayName: profile?.display_name as string | null ?? null,
        toneNotes: profile?.tone_notes as string | null ?? null,
        mentalModels: (profile?.mental_models as Array<{ name: string; description: string }>) ?? [],
        philosophies: (profile?.philosophies as Array<{ name: string; description: string }>) ?? [],
        targetAudiences: (profile?.target_audiences as string[]) ?? [],
        sampleContent: (profile?.sample_content as string[]) ?? [],
      },
    })

    // Mark as generating
    await supabase
      .from('generations')
      .update({ status: 'generating', prompt_snapshot: systemPrompt })
      .eq('id', generation_id)

    // Call Claude
    let aiResult
    try {
      aiResult = await callClaude({
        systemPrompt,
        userMessage,
        model: gen.model as string,
      })
    } catch (err) {
      await logger.error('Claude call failed', { error: String(err) })
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: String(err) })
        .eq('id', generation_id)
      return
    }

    // Parse JSON response with fallback
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
      .eq('id', generation_id)

    // Create output record
    const { error: outputError } = await supabase.from('outputs').insert({
      workspace_id: gen.workspace_id as string,
      generation_id,
      status: 'draft',
      title: typeof content.hook === 'string' ? (content.hook as string).slice(0, 120) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: content as any,
    })

    if (outputError) {
      await logger.error('Failed to create output', { error: outputError.message })
      return
    }

    await logger.info('Generation complete', {
      generation_id,
      tokens: aiResult.inputTokens + aiResult.outputTokens,
      duration_ms: aiResult.durationMs,
    })
  },
})
