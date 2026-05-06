// Framework Lens — main generation pipeline
// Single public export: generateFrameworks()
//
// Pipeline:
//   input → buildFrameworkSystemPrompt() → callClaude()
//         → parseFrameworkCandidates() → scoreCandidate() × N
//         → rankCandidates() → buildSocialAssets(top)
//         → FrameworkOutput

import { callClaude } from '@/lib/ai/generate'
import { buildFrameworkSystemPrompt, buildFrameworkUserMessage } from './frameworkPrompt'
import { parseFrameworkCandidates, FrameworkParseError } from './frameworkParser'
import { scoreCandidate, rankCandidates, SCORING_WEIGHTS, RANKING_VERSION } from './frameworkScoring'
import { buildSocialAssets } from './frameworkAssets'
import type { FrameworkOutput, FrameworkCandidate, RawFrameworkCandidate } from './frameworkTypes'

const FRAMEWORK_MODEL = 'claude-sonnet-4-6'
const FRAMEWORK_MAX_TOKENS = 4096

export interface GenerateFrameworksParams {
  captureContent: string
  // Profile context is optional — framework quality doesn't require creator-specific tuning
  // but it can inform intellectual territory attribution in future
  profileContext?: {
    displayName?: string | null
    industries?: string[]
  }
}

export async function generateFrameworks(params: GenerateFrameworksParams): Promise<FrameworkOutput> {
  const { captureContent } = params
  const t0 = Date.now()

  if (!captureContent.trim()) {
    throw new Error('captureContent is empty')
  }

  // Call Claude for multi-candidate generation
  const systemPrompt = buildFrameworkSystemPrompt()
  const userMessage = buildFrameworkUserMessage(captureContent)

  const aiResult = await callClaude({
    systemPrompt,
    userMessage,
    model: FRAMEWORK_MODEL,
    maxTokens: FRAMEWORK_MAX_TOKENS,
  })

  // Parse raw candidates
  let rawCandidates: RawFrameworkCandidate[]
  try {
    rawCandidates = parseFrameworkCandidates(aiResult.content)
  } catch (err) {
    if (err instanceof FrameworkParseError) {
      throw new Error(`Framework extraction failed: ${err.message}`)
    }
    throw err
  }

  // Score and rank
  const scoredCandidates: FrameworkCandidate[] = rawCandidates.map(scoreCandidate)
  const ranked = rankCandidates(scoredCandidates)
  const [top, ...alternates] = ranked

  // Build social assets from top candidate (separate Haiku call)
  const socialAssets = await buildSocialAssets(top)

  return {
    top,
    alternates,
    rawCandidates: scoredCandidates, // all 5, pre-ranking order (as returned by Claude)
    socialAssets,
    rankingMetadata: {
      scoringWeights: SCORING_WEIGHTS,
      rankingVersion: RANKING_VERSION,
      candidateCount: rawCandidates.length,
    },
    generationMetadata: {
      model: FRAMEWORK_MODEL,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      durationMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    },
  }
}
