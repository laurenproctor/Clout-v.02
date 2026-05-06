// Contrarian Lens — main generation pipeline
//
// Pipeline:
//   captureContent
//     → Phase 1–5: Structural Analysis  (Sonnet, temp 0.3)
//         consensus detection, hidden assumptions, reversal mechanisms,
//         second-order effects, tension points
//     → Phase 6: Contrarian Rewrite     (Sonnet, temp 0.4)
//     → Phase 7: Scoring                (synchronous)
//     → ContrarianOutput

import { callClaude } from '@/lib/ai/generate'
import {
  buildContrarianAnalysisPrompt,
  buildContrarianUserMessage,
  buildContrarianRewritePrompt,
} from './contrarianPrompt'
import { parseContrarianAnalysis, parseContrarianRewrite, ContrarianParseError } from './contrarianParser'
import { scoreContrarian } from './contrarianScoring'
import type { ContrarianOutput } from './contrarianTypes'

const CONTRARIAN_MODEL = 'claude-sonnet-4-6'

export interface GenerateContrarianParams {
  captureContent: string
}

export async function generateContrarian(
  params: GenerateContrarianParams
): Promise<ContrarianOutput> {
  const { captureContent } = params
  const t0 = Date.now()

  if (!captureContent.trim()) throw new Error('captureContent is empty')

  // Phases 1–5: Structural analysis
  const analysisResult = await callClaude({
    systemPrompt: buildContrarianAnalysisPrompt(),
    userMessage: buildContrarianUserMessage(captureContent),
    model: CONTRARIAN_MODEL,
    maxTokens: 3000,
    temperature: 0.3,
  })

  let analysis: ReturnType<typeof parseContrarianAnalysis>
  try {
    analysis = parseContrarianAnalysis(analysisResult.content)
  } catch (err) {
    if (err instanceof ContrarianParseError) {
      throw new Error(`Contrarian analysis failed to parse: ${err.message}`)
    }
    throw err
  }

  // Phase 6: Contrarian rewrite
  const rewriteResult = await callClaude({
    systemPrompt: 'You are a rewrite specialist who sharpens structural contrarianism while preserving the creator\'s native voice. Return only the JSON object requested.',
    userMessage: buildContrarianRewritePrompt(captureContent, analysis),
    model: CONTRARIAN_MODEL,
    maxTokens: 4096,
    temperature: 0.4,
  })

  let rewrite: ReturnType<typeof parseContrarianRewrite>
  try {
    rewrite = parseContrarianRewrite(rewriteResult.content)
  } catch {
    rewrite = {
      rewrittenContent: captureContent,
      distinctionNote: 'Rewrite parsing failed — original content preserved.',
    }
  }

  // Phase 7: Scoring
  const { score: contrarianScore, breakdown: scoreBreakdown } = scoreContrarian({
    ...analysis,
    distinctionNote: rewrite.distinctionNote,
  })

  const inputTokens = analysisResult.inputTokens + rewriteResult.inputTokens
  const outputTokens = analysisResult.outputTokens + rewriteResult.outputTokens

  return {
    contrarianScore,
    scoreBreakdown,
    consensusFrame: analysis.consensusFrame,
    hiddenAssumptions: analysis.hiddenAssumptions,
    reversalMechanisms: analysis.reversalMechanisms,
    secondOrderEffects: analysis.secondOrderEffects,
    tensionPoints: analysis.tensionPoints,
    rewrittenContent: rewrite.rewrittenContent,
    strongestAsymmetry: analysis.strongestAsymmetry,
    resistancePrediction: analysis.resistancePrediction,
    distinctionNote: rewrite.distinctionNote,
    generationMetadata: {
      model: CONTRARIAN_MODEL,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    },
  }
}
