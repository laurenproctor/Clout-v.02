import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createAssistantOutput } from '@/lib/assistant/createAssistantOutput'
import { createClient } from '@/lib/supabase/server'
import type { InferredIntent } from '@/types/domain'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const text: string = body.text ?? ''
  const lensId: string | null = body.lensId ?? null
  const profileName: string | null = body.profileName ?? null
  const overrides: Partial<Pick<InferredIntent, 'isPrivate' | 'outputFormat' | 'intentClass' | 'suggestedChannel' | 'tone'>> =
    body.overrides ?? {}

  if (!text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  let result: Awaited<ReturnType<typeof createAssistantOutput>>
  try {
    result = await createAssistantOutput({
      text,
      workspaceId: session.workspaceId,
      userId: session.userId,
      profileName,
      lensId,
      overrides,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start generation' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send metadata first so client knows outputId before content arrives
      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            type: 'meta',
            sessionId: result.sessionId,
            outputId: result.outputId,
            intent: result.intent,
            goal: result.goal,
          }) + '\n'
        )
      )

      let accumulatedContent = ''
      const startMs = Date.now()

      try {
        for await (const chunk of result.stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            accumulatedContent += text
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'delta', text }) + '\n')
            )
          }
        }

        // Stream complete — persist final content
        const finalUsage = await result.stream.finalMessage()
        const latencyMs = Date.now() - startMs

        await Promise.all([
          // Update output with generated content
          supabase
            .from('outputs')
            .update({ content: { body: accumulatedContent } })
            .eq('id', result.outputId),

          // Update legacy generation record
          supabase
            .from('generations')
            .update({
              status: 'complete',
              raw_response: accumulatedContent,
              duration_ms: latencyMs,
              token_count: finalUsage.usage.output_tokens,
              completed_at: new Date().toISOString(),
            })
            .eq('id', result.legacyGenerationId),

          // Update assistant_generation record
          ...(result.generationId
            ? [
                supabase
                  .from('assistant_generations')
                  .update({
                    status: 'completed',
                    latency_ms: latencyMs,
                    tokens_input: finalUsage.usage.input_tokens,
                    tokens_output: finalUsage.usage.output_tokens,
                    stream_state: 'complete',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', result.generationId),
              ]
            : []),

          // Emit completion event
          supabase.from('assistant_events').insert({
            workspace_id: session.workspaceId,
            session_id: result.sessionId,
            generation_id: result.generationId || null,
            event_type: 'generation_completed',
            payload: {
              outputId: result.outputId,
              latencyMs,
              tokensOutput: finalUsage.usage.output_tokens,
            },
          }),

          // Save assistant message
          supabase.from('assistant_messages').insert({
            session_id: result.sessionId,
            workspace_id: session.workspaceId,
            role: 'assistant',
            content: accumulatedContent,
            model: 'claude-sonnet-4-6',
            tokens_used: finalUsage.usage.output_tokens,
          }),
        ])

        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: 'done', outputId: result.outputId }) + '\n'
          )
        )
      } catch (streamErr) {
        // Persist failure state
        const errMsg = streamErr instanceof Error ? streamErr.message : 'Stream error'
        await Promise.all([
          supabase
            .from('generations')
            .update({ status: 'failed', error_message: errMsg })
            .eq('id', result.legacyGenerationId),
          ...(result.generationId
            ? [
                supabase
                  .from('assistant_generations')
                  .update({ status: 'failed', failure_reason: errMsg })
                  .eq('id', result.generationId),
              ]
            : []),
          supabase.from('assistant_events').insert({
            workspace_id: session.workspaceId,
            session_id: result.sessionId,
            generation_id: result.generationId || null,
            event_type: 'generation_failed',
            payload: { error: errMsg },
          }),
        ])

        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'error', error: errMsg }) + '\n')
        )
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
