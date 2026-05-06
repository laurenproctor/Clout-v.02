// Authority Lens — main generation pipeline
//
// Pipeline:
//   captureContent
//     → Phase 1: Authority Analysis    (Sonnet, temp 0.3)
//     → Phase 2: Evidence Retrieval    (Tavily, Promise.allSettled, top 4)
//     → Phase 3a: Deterministic Validation
//     → Phase 3b: Semantic Validation  (Haiku, temp 0.1)
//     → Phase 4: Authority Rewrite     (Sonnet, temp 0.4)
//     → Phase 5: Scoring               (synchronous)
//     → AuthorityOutput

import { callClaude } from '@/lib/ai/generate'
import { retrieveEvidence } from '@/lib/evidence/evidenceRetrieval'
import { deterministicValidation, semanticValidation } from '@/lib/evidence/evidenceValidation'
import { applyEvidenceContributions } from '@/lib/evidence/evidenceScoring'
import { formatEvidenceForRewrite } from '@/lib/evidence/evidenceIntegration'
import {
  buildAuthorityAnalysisPrompt,
  buildAuthorityUserMessage,
  buildRewritePrompt,
} from './authorityPrompt'
import { parseAuthorityAnalysis, parseRewriteResponse, AuthorityParseError } from './authorityParser'
import { scoreAuthority } from './authorityScoring'
import type { AuthorityOutput } from './authorityTypes'

const AUTHORITY_MODEL = 'claude-sonnet-4-6'
const REWRITE_TEMPERATURE = 0.4

export interface GenerateAuthorityParams {
  captureContent: string
}

export async function generateAuthority(
  params: GenerateAuthorityParams
): Promise<AuthorityOutput> {
  const { captureContent } = params
  const t0 = Date.now()

  if (!captureContent.trim()) throw new Error('captureContent is empty')

  // Phase 1: Authority Analysis
  const analysisResult = await callClaude({
    systemPrompt: buildAuthorityAnalysisPrompt(),
    userMessage: buildAuthorityUserMessage(captureContent),
    model: AUTHORITY_MODEL,
    maxTokens: 3000,
    temperature: 0.3,
  })

  let analysis: ReturnType<typeof parseAuthorityAnalysis>
  try {
    analysis = parseAuthorityAnalysis(analysisResult.content)
  } catch (err) {
    if (err instanceof AuthorityParseError) {
      throw new Error(`Authority analysis failed to parse: ${err.message}`)
    }
    throw err
  }

  // Phase 2: Evidence Retrieval
  let rawEvidence: Awaited<ReturnType<typeof retrieveEvidence>>
  let evidenceRetrievalFailed = false

  try {
    rawEvidence = await retrieveEvidence(analysis.evidenceOpportunities)
    evidenceRetrievalFailed = rawEvidence.anyFailed && rawEvidence.evidence.length === 0
  } catch {
    rawEvidence = { evidence: [], anyFailed: true }
    evidenceRetrievalFailed = true
  }

  // Phase 3a: Deterministic Validation
  const { evidence: deterministicEvidence, sourceDiversityScore } = deterministicValidation(
    rawEvidence.evidence
  )

  // Phase 3b: Semantic Validation
  const { evidence: validatedEvidence, notes: evidenceSemanticValidationNotes } =
    await semanticValidation(deterministicEvidence)

  // Phase 4: Rewrite
  const hasEvidence = validatedEvidence.length > 0
  const evidenceBlock = hasEvidence ? formatEvidenceForRewrite(validatedEvidence) : ''

  const rewriteResult = await callClaude({
    systemPrompt: 'You are a rewrite specialist who strengthens authority architecture while preserving the creator\'s native voice. Return only the JSON object requested.',
    userMessage: buildRewritePrompt(
      captureContent,
      evidenceBlock,
      analysis.nativeAuthoritySource,
      hasEvidence
    ),
    model: AUTHORITY_MODEL,
    maxTokens: 4096,
    temperature: REWRITE_TEMPERATURE,
  })

  let rewrite: ReturnType<typeof parseRewriteResponse>
  try {
    rewrite = parseRewriteResponse(rewriteResult.content)
  } catch {
    // Rewrite parse failure — use original content as fallback
    rewrite = {
      rewrittenContent: captureContent,
      credibilityDensityNote: 'Rewrite parsing failed — original content preserved.',
      evidenceContributions: [],
    }
  }

  // Apply evidence contributions post-rewrite
  const scoredEvidence = applyEvidenceContributions(validatedEvidence, rewrite.evidenceContributions)

  // Phase 5: Scoring
  const { score: authorityScore, breakdown: scoreBreakdown } = scoreAuthority(analysis, scoredEvidence)

  const inputTokens = analysisResult.inputTokens + rewriteResult.inputTokens
  const outputTokens = analysisResult.outputTokens + rewriteResult.outputTokens

  return {
    authorityScore,
    scoreBreakdown,
    nativeAuthoritySource: analysis.nativeAuthoritySource,
    trustMechanisms: analysis.trustMechanisms,
    resistancePoints: analysis.resistancePoints,
    unsupportedClaims: analysis.unsupportedClaims,
    weakAuthorityClaims: analysis.weakAuthorityClaims,
    evidenceOpportunities: analysis.evidenceOpportunities,
    retrievedEvidence: scoredEvidence,
    evidenceRetrievalFailed,
    evidenceSemanticValidationNotes: evidenceSemanticValidationNotes || undefined,
    rewrittenContent: rewrite.rewrittenContent,
    rewriteUsedEvidence: hasEvidence,
    credibilityDensityNote: rewrite.credibilityDensityNote,
    confidenceCalibration: analysis.confidenceCalibration,
    generationMetadata: {
      model: AUTHORITY_MODEL,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
      evidenceSearchCount: analysis.evidenceOpportunities.length,
      sourceDiversityScore,
    },
  }
}
