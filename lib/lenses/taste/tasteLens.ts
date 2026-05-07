// Taste Lens — main generation pipeline
//
// Pipeline:
//   captureContent
//     → Phase 1: Taste Analysis     (Sonnet, temp 0.3)
//         clichePatterns, restraintOpportunities, culturalPrecision,
//         emotionalTexture, tasteAnchors, strongestLine, tasteSummary, refinementNote
//     → Phase 2: Taste Rewrite      (Sonnet, temp 0.4)
//         rewrittenContent — anchors protected throughout
//     → Phase 3: Scoring            (synchronous)
//     → TasteOutput

import { callClaude } from '@/lib/ai/generate'
import { buildTasteAnalysisPrompt, buildTasteUserMessage } from './tastePrompt'
import { buildTasteRewritePrompt } from './tasteRewrite'
import { parseTasteAnalysis, parseTasteRewrite, TasteParseError } from './tasteParser'
import { scoreTaste } from './tasteScoring'
import type { TasteOutput } from './tasteTypes'

const TASTE_MODEL = 'claude-sonnet-4-6'

export interface GenerateTasteParams {
  captureContent: string
}

export async function generateTaste(params: GenerateTasteParams): Promise<TasteOutput> {
  const { captureContent } = params
  const t0 = Date.now()

  if (!captureContent.trim()) throw new Error('captureContent is empty')

  // Phase 1: Taste Analysis
  const analysisResult = await callClaude({
    systemPrompt: buildTasteAnalysisPrompt(),
    userMessage: buildTasteUserMessage(captureContent),
    model: TASTE_MODEL,
    maxTokens: 3000,
    temperature: 0.3,
  })

  let analysis: ReturnType<typeof parseTasteAnalysis>
  try {
    analysis = parseTasteAnalysis(analysisResult.content)
  } catch (err) {
    if (err instanceof TasteParseError) {
      throw new Error(`Taste analysis failed to parse: ${err.message}`)
    }
    throw err
  }

  // Phase 2: Taste Rewrite — anchors passed through to protect identity gravity
  const rewriteResult = await callClaude({
    systemPrompt: 'You are a discernment editor who refines content for intentionality and precision while preserving the creator\'s native voice. Return only the JSON object requested.',
    userMessage: buildTasteRewritePrompt(captureContent, analysis),
    model: TASTE_MODEL,
    maxTokens: 4096,
    temperature: 0.4,
  })

  let rewrite: { rewrittenContent: string }
  try {
    rewrite = parseTasteRewrite(rewriteResult.content)
  } catch {
    rewrite = { rewrittenContent: captureContent }
  }

  // Phase 3: Scoring
  const { score: tasteScore, breakdown: scoreBreakdown } = scoreTaste(analysis)

  return {
    tasteScore,
    scoreBreakdown,
    clichePatterns: analysis.clichePatterns,
    restraintOpportunities: analysis.restraintOpportunities,
    culturalPrecision: analysis.culturalPrecision,
    emotionalTexture: analysis.emotionalTexture,
    tasteAnchors: analysis.tasteAnchors,
    rewrittenContent: rewrite.rewrittenContent,
    strongestLine: analysis.strongestLine,
    tasteSummary: analysis.tasteSummary,
    refinementNote: analysis.refinementNote,
    generationMetadata: {
      model: TASTE_MODEL,
      inputTokens: analysisResult.inputTokens + rewriteResult.inputTokens,
      outputTokens: analysisResult.outputTokens + rewriteResult.outputTokens,
      durationMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    },
  }
}
