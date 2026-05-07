// Incentive Lens — main generation pipeline
//
// Pipeline:
//   captureContent
//     → Phase 1: Incentive Analysis  (Sonnet, temp 0.3)
//         actors, conflicts, observations, alignment,
//         hiddenTradeoff, systemPressure
//     → Phase 2: Incentive Rewrite   (Sonnet, temp 0.4)
//         rewrittenContent + incentiveSummary + strategicImplication
//     → Phase 3: Scoring             (synchronous)
//     → IncentiveOutput

import { callClaude } from '@/lib/ai/generate'
import {
  buildIncentiveAnalysisPrompt,
  buildIncentiveUserMessage,
  buildIncentiveRewritePrompt,
} from './incentivePrompt'
import { parseIncentiveAnalysis, parseIncentiveRewrite, IncentiveParseError } from './incentiveParser'
import { scoreIncentive } from './incentiveScoring'
import type { IncentiveOutput } from './incentiveTypes'

const INCENTIVE_MODEL = 'claude-sonnet-4-6'

export interface GenerateIncentiveParams {
  captureContent: string
}

export async function generateIncentive(
  params: GenerateIncentiveParams
): Promise<IncentiveOutput> {
  const { captureContent } = params
  const t0 = Date.now()

  if (!captureContent.trim()) throw new Error('captureContent is empty')

  // Phase 1: Incentive Analysis
  const analysisResult = await callClaude({
    systemPrompt: buildIncentiveAnalysisPrompt(),
    userMessage: buildIncentiveUserMessage(captureContent),
    model: INCENTIVE_MODEL,
    maxTokens: 3000,
    temperature: 0.3,
  })

  let analysis: ReturnType<typeof parseIncentiveAnalysis>
  try {
    analysis = parseIncentiveAnalysis(analysisResult.content)
  } catch (err) {
    if (err instanceof IncentiveParseError) {
      throw new Error(`Incentive analysis failed to parse: ${err.message}`)
    }
    throw err
  }

  // Phase 2: Incentive Rewrite
  const rewriteResult = await callClaude({
    systemPrompt: 'You are a rewrite specialist who surfaces structural incentive logic while preserving the creator\'s native voice. Return only the JSON object requested.',
    userMessage: buildIncentiveRewritePrompt(captureContent, analysis),
    model: INCENTIVE_MODEL,
    maxTokens: 4096,
    temperature: 0.4,
  })

  let rewrite: ReturnType<typeof parseIncentiveRewrite>
  try {
    rewrite = parseIncentiveRewrite(rewriteResult.content)
  } catch {
    rewrite = {
      rewrittenContent: captureContent,
      incentiveSummary: '',
      strategicImplication: '',
    }
  }

  // Phase 3: Scoring
  const { score: incentiveScore, breakdown: scoreBreakdown } = scoreIncentive(analysis)

  const inputTokens = analysisResult.inputTokens + rewriteResult.inputTokens
  const outputTokens = analysisResult.outputTokens + rewriteResult.outputTokens

  return {
    incentiveScore,
    scoreBreakdown,
    primaryIncentive: analysis.primaryIncentive,
    actors: analysis.actors,
    ...(analysis.conflicts !== undefined && { conflicts: analysis.conflicts }),
    observations: analysis.observations,
    alignment: analysis.alignment,
    ...(analysis.hiddenTradeoff !== undefined && { hiddenTradeoff: analysis.hiddenTradeoff }),
    ...(analysis.systemPressure !== undefined && { systemPressure: analysis.systemPressure }),
    rewrittenContent: rewrite.rewrittenContent,
    incentiveSummary: rewrite.incentiveSummary,
    strategicImplication: rewrite.strategicImplication,
    generationMetadata: {
      model: INCENTIVE_MODEL,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    },
  }
}
