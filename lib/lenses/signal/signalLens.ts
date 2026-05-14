// Signal Lens — main generation pipeline
//
// Pipeline:
//   captureContent
//     → Phases 1–5: Signal Analysis  (Sonnet, temp 0.3)
//         weak signals, directional shifts, structural transitions,
//         incentive changes, future implications
//     → Phase 6: Signal Rewrite      (Sonnet, temp 0.4)
//         sharpened directional content + signalSummary + strategicImplication
//     → Phase 7: Scoring             (synchronous)
//     → SignalOutput

import { callClaude } from '@/lib/ai/generate'
import {
  buildSignalAnalysisPrompt,
  buildSignalUserMessage,
  buildSignalRewritePrompt,
} from './signalPrompt'
import { parseSignalAnalysis, parseSignalRewrite, SignalParseError } from './signalParser'
import { scoreSignal } from './signalScoring'
import type { SignalOutput } from './signalTypes'

const SIGNAL_MODEL = 'claude-sonnet-4-6'

export interface GenerateSignalParams {
  captureContent: string
}

export async function generateSignal(
  params: GenerateSignalParams
): Promise<SignalOutput> {
  const { captureContent } = params
  const t0 = Date.now()

  if (!captureContent.trim()) throw new Error('captureContent is empty')

  // Phases 1–5: Signal Analysis
  const analysisResult = await callClaude({
    systemPrompt: buildSignalAnalysisPrompt(),
    userMessage: buildSignalUserMessage(captureContent),
    model: SIGNAL_MODEL,
    maxTokens: 3000,
    temperature: 0.3,
  })

  let analysis: ReturnType<typeof parseSignalAnalysis>
  try {
    analysis = parseSignalAnalysis(analysisResult.content)
  } catch (err) {
    if (err instanceof SignalParseError) {
      throw new Error(`Signal analysis failed to parse: ${err.message}`)
    }
    throw err
  }

  // Phase 6: Signal Rewrite
  const rewriteResult = await callClaude({
    systemPrompt: 'You are a rewrite specialist who sharpens directional intelligence while preserving the creator\'s native voice. Return only the JSON object requested.',
    userMessage: buildSignalRewritePrompt(captureContent, analysis),
    model: SIGNAL_MODEL,
    maxTokens: 4096,
    temperature: 0.4,
  })

  let rewrite: ReturnType<typeof parseSignalRewrite>
  try {
    rewrite = parseSignalRewrite(rewriteResult.content)
  } catch {
    rewrite = {
      rewrittenContent: captureContent,
      signalSummary: '',
      strategicImplication: '',
    }
  }

  // Phase 7: Scoring
  const { score: signalScore, breakdown: scoreBreakdown } = scoreSignal(analysis)

  const inputTokens = analysisResult.inputTokens + rewriteResult.inputTokens
  const outputTokens = analysisResult.outputTokens + rewriteResult.outputTokens

  return {
    signalScore,
    scoreBreakdown,
    strongestSignal: analysis.strongestSignal,
    weakSignals: analysis.weakSignals,
    directionalShifts: analysis.directionalShifts,
    structuralTransitions: analysis.structuralTransitions,
    incentiveChanges: analysis.incentiveChanges,
    futureImplications: analysis.futureImplications,
    signalRisk: analysis.signalRisk,
    signalAsymmetry: analysis.signalAsymmetry,
    rewrittenContent: rewrite.rewrittenContent,
    signalSummary: rewrite.signalSummary,
    strategicImplication: rewrite.strategicImplication,
    generationMetadata: {
      model: SIGNAL_MODEL,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    },
  }
}
