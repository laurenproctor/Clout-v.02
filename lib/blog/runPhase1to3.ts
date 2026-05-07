// lib/blog/runPhase1to3.ts
import { generateNarrativeStrategy } from './generateNarrativeStrategy'
import { generateHookExploration } from './generateHookExploration'
import type { BlogPromptContext } from './buildBlogPrompt'

export function runPhase1to3(ctx: BlogPromptContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      let totalInput = 0
      let totalOutput = 0

      try {
        emit({ type: 'progress', phase: 'narrative-strategy', label: 'Building argument architecture...' })
        const ns = await generateNarrativeStrategy(ctx)
        totalInput += ns.inputTokens
        totalOutput += ns.outputTokens
        emit({ type: 'phase-complete', phase: 'narrative-strategy', data: ns.result })

        emit({ type: 'progress', phase: 'hook-exploration', label: 'Exploring headline angles...' })
        const he = await generateHookExploration(ctx, ns.result)
        totalInput += he.inputTokens
        totalOutput += he.outputTokens
        emit({ type: 'phase-complete', phase: 'hook-exploration', data: he.result })

        emit({
          type: 'paused',
          message: 'Review your editorial strategy before generating the article.',
          metadata: { inputTokens: totalInput, outputTokens: totalOutput },
        })
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })
}
