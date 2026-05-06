import type { Evidence, EvidenceOpportunity } from '@/lib/evidence/evidenceTypes'

export type TrustMechanismType =
  | 'lived_experience'
  | 'operational_specificity'
  | 'strategic_vulnerability'
  | 'earned_authority'
  | 'pattern_recognition'
  | 'evidence_backing'
  | 'historical_reference'
  | 'conviction_calibration'
  | 'expert_language'
  | 'comparative_reasoning'

export type ResistanceType =
  | 'unsupported_claim'
  | 'premature_conclusion'
  | 'generic_language'
  | 'overconfidence'
  | 'lack_of_evidence'
  | 'vague_abstraction'
  | 'weak_operational_depth'
  | 'contrarian_without_support'

export interface AuthoritySignal {
  type: TrustMechanismType
  observation: string       // what structurally occurs — factual
  interpretation: string    // why it builds or erodes authority — causal
  strength: number          // 0–1
  confidence: number        // 0–1
}

// Factual claim that needs external verification
export interface UnsupportedClaim {
  claim: string
  reason: string            // why external evidence would strengthen it
  severity: number          // 0–1 impact on credibility if unsubstantiated
}

// Structurally weak claim — erodes authority through abstraction, not missing data
export interface WeakAuthorityClaim {
  claim: string
  weakness: ResistanceType
  explanation: string       // what makes it structurally weak
  severity: number
}

export interface AuthorityScoreBreakdown {
  credibility: number
  specificity: number
  evidenceQuality: number
  confidenceCalibration: number
  operationalDepth: number
  patternRecognition: number
  trustSequencing: number
  authorityCoherence: number  // worldview continuity, tonal consistency, reasoning integrity
  authorityConsistency: number
}

// The primary source of authority for this creator — shapes rewrite calibration
// Different creators derive authority differently; this prevents convergence toward
// a single institutional-strategist voice that flattens individual cognitive texture
export type NativeAuthoritySource =
  | 'operational_experience'        // founders, operators — implementation detail
  | 'research_depth'                // researchers — evidence and methodology
  | 'historical_knowledge'          // historians, journalists — contextual framing
  | 'strategic_pattern_recognition' // strategists, advisors — asymmetric insight
  | 'technical_expertise'           // engineers, scientists — mechanism explanation
  | 'cultural_positioning'          // artists, critics — taste and positioning
  | 'founder_experience'            // founder-specific: lived operational consequence

export interface AuthorityOutput {
  authorityScore: number
  scoreBreakdown: AuthorityScoreBreakdown

  // Detected from content; drives rewrite calibration — prevents voice flattening
  nativeAuthoritySource: NativeAuthoritySource

  trustMechanisms: AuthoritySignal[]
  resistancePoints: {
    type: ResistanceType
    explanation: string
    severity: number
  }[]

  // Epistemic weakness — needs external evidence
  unsupportedClaims: UnsupportedClaim[]
  // Rhetorical weakness — needs structural improvement (no evidence required)
  weakAuthorityClaims: WeakAuthorityClaim[]

  evidenceOpportunities: EvidenceOpportunity[]
  retrievedEvidence: Evidence[]
  evidenceRetrievalFailed: boolean
  evidenceSemanticValidationNotes?: string

  rewrittenContent: string
  rewriteUsedEvidence: boolean     // false = degraded to operational framing
  credibilityDensityNote: string   // system's self-assessment of citation vs insight balance

  confidenceCalibration: string    // narrative explanation of overall confidence

  generationMetadata: {
    model: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    generatedAt: string
    evidenceSearchCount: number
    // V1: unique source domains / total results
    sourceDiversityScore?: number
  }
}

export const AUTHORITY_CONTENT_TYPE = 'authority' as const
