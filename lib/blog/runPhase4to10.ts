// lib/blog/runPhase4to10.ts
import { generateMetadata } from './generateMetadata'
import { generateOutline } from './generateOutline'
import { generateSections } from './generateSections'
import { generateImageSpecs } from './generateImageSpecs'
import { analyzeContent } from './analyzeContent'
import type { BlogPromptContext } from './buildBlogPrompt'
import type { NarrativeStrategy, HookExploration, GeneratedBlogPackage } from './types'

export interface Phase4to10Input {
  ctx: BlogPromptContext
  narrativeStrategy: NarrativeStrategy
  hookExploration: HookExploration
  selectedHeadline: string
  startedAt: string
}

export function runPhase4to10(input: Phase4to10Input): ReadableStream<Uint8Array> {
  const { ctx, narrativeStrategy, hookExploration, selectedHeadline, startedAt } = input
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      let totalInput = 0
      let totalOutput = 0
      const phases: GeneratedBlogPackage['generationMetadata']['phases'] = []

      const track = (phase: string, label: string, i: number, o: number) => {
        totalInput += i
        totalOutput += o
        phases.push({ phase, label, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), inputTokens: i, outputTokens: o })
      }

      try {
        // Phases 5+6 in parallel: metadata and outline are independent
        emit({ type: 'progress', phase: 'metadata', label: 'Writing metadata...' })
        emit({ type: 'progress', phase: 'outline', label: 'Structuring content around your argument...' })
        const [meta, outline] = await Promise.all([
          generateMetadata(ctx, narrativeStrategy, selectedHeadline),
          generateOutline(ctx, narrativeStrategy, selectedHeadline),
        ])
        track('metadata', 'Metadata', meta.inputTokens, meta.outputTokens)
        track('outline', 'Outline', outline.inputTokens, outline.outputTokens)
        emit({ type: 'phase-complete', phase: 'metadata', data: meta.result })
        emit({ type: 'phase-complete', phase: 'outline', data: outline.result })

        // Phase 7: Sections (sequential — each section informs the next via memory)
        emit({ type: 'progress', phase: 'sections', label: 'Writing article sections...' })
        const lengthWords: Record<string, number> = { short: 800, standard: 1500, long: 2500, pillar: 4000 }
        const targetWords = lengthWords[ctx.request.length] ?? 1500
        const sections = await generateSections(ctx, narrativeStrategy, outline.result, selectedHeadline, (i, total) => {
          emit({ type: 'progress', phase: 'sections', label: `Writing section ${i} of ${total}...` })
        }, targetWords)
        track('sections', 'Sections', sections.totalInputTokens, sections.totalOutputTokens)
        emit({ type: 'phase-complete', phase: 'sections', data: { markdown: sections.markdown, wordCount: sections.wordCount } })

        // Phases 8+9 in parallel: both independent once sections exist
        emit({ type: 'progress', phase: 'image-specs', label: 'Generating image specifications...' })
        emit({ type: 'progress', phase: 'content-analysis', label: 'Assessing editorial quality...' })
        const [images, analysis] = await Promise.all([
          generateImageSpecs(ctx, narrativeStrategy, outline.result, selectedHeadline),
          analyzeContent(ctx, narrativeStrategy, sections.markdown, outline.result, meta.result, selectedHeadline),
        ])
        track('image-specs', 'Image Specs', images.inputTokens, images.outputTokens)
        track('content-analysis', 'Content Analysis', analysis.inputTokens, analysis.outputTokens)
        emit({ type: 'phase-complete', phase: 'image-specs', data: { hero: images.hero, inline: images.inline } })

        const blogPackage: GeneratedBlogPackage = {
          request: ctx.request,
          narrativeStrategy,
          hookExploration,
          selectedHeadline,
          metadata: meta.result,
          article: {
            title: selectedHeadline,
            outline: outline.result,
            markdown: sections.markdown,
            wordCount: sections.wordCount,
          },
          images: { hero: images.hero, inline: images.inline },
          distribution: {},
          contentAnalysis: analysis.contentAnalysis,
          strategicInsights: analysis.strategicInsights,
          generationMetadata: {
            model: 'claude-sonnet-4-6',
            totalInputTokens: totalInput,
            totalOutputTokens: totalOutput,
            totalDurationMs: Date.now() - new Date(startedAt).getTime(),
            generatedAt: new Date().toISOString(),
            phases,
          },
        }

        emit({ type: 'complete', data: blogPackage })
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })
}
