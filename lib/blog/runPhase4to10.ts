// lib/blog/runPhase4to10.ts
import { generateMetadata } from './generateMetadata'
import { generateOutline } from './generateOutline'
import { generateSections } from './generateSections'
import { generateImageSpecs } from './generateImageSpecs'
import { generateDistribution } from './generateDistribution'
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
        // Phase 5: Metadata
        emit({ type: 'progress', phase: 'metadata', label: 'Writing metadata...' })
        const meta = await generateMetadata(ctx, narrativeStrategy, selectedHeadline)
        track('metadata', 'Metadata', meta.inputTokens, meta.outputTokens)
        emit({ type: 'phase-complete', phase: 'metadata', data: meta.result })

        // Phase 6: Outline
        emit({ type: 'progress', phase: 'outline', label: 'Structuring content around your argument...' })
        const outline = await generateOutline(ctx, narrativeStrategy, selectedHeadline)
        track('outline', 'Outline', outline.inputTokens, outline.outputTokens)
        emit({ type: 'phase-complete', phase: 'outline', data: outline.result })

        // Phase 7: Sections (progress per section)
        for (let i = 0; i < outline.result.length; i++) {
          const label = i === 0 ? 'Writing introduction...' : `Writing section ${i + 1} of ${outline.result.length}...`
          emit({ type: 'progress', phase: 'sections', label })
        }
        const sections = await generateSections(ctx, narrativeStrategy, outline.result, selectedHeadline)
        track('sections', 'Sections', sections.totalInputTokens, sections.totalOutputTokens)
        emit({ type: 'phase-complete', phase: 'sections', data: { markdown: sections.markdown, wordCount: sections.wordCount } })

        // Phase 8: Image specs
        emit({ type: 'progress', phase: 'image-specs', label: 'Generating image specifications...' })
        const images = await generateImageSpecs(ctx, narrativeStrategy, outline.result, selectedHeadline)
        track('image-specs', 'Image Specs', images.inputTokens, images.outputTokens)
        emit({ type: 'phase-complete', phase: 'image-specs', data: { hero: images.hero, inline: images.inline } })

        // Phase 9: Distribution
        emit({ type: 'progress', phase: 'distribution', label: 'Adapting for platform psychology...' })
        const dist = await generateDistribution(ctx, narrativeStrategy, sections.markdown, selectedHeadline)
        track('distribution', 'Distribution', dist.inputTokens, dist.outputTokens)
        emit({ type: 'phase-complete', phase: 'distribution', data: { linkedin: dist.linkedin, xThread: dist.xThread, newsletter: dist.newsletter } })

        // Phase 10: Content analysis
        emit({ type: 'progress', phase: 'content-analysis', label: 'Assessing editorial quality...' })
        const analysis = await analyzeContent(ctx, narrativeStrategy, sections.markdown, outline.result, meta.result, selectedHeadline)
        track('content-analysis', 'Content Analysis', analysis.inputTokens, analysis.outputTokens)

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
          distribution: { linkedin: dist.linkedin, xThread: dist.xThread, newsletter: dist.newsletter },
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
