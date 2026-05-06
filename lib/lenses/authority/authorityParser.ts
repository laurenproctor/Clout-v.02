import type { AuthorityOutput, NativeAuthoritySource, TrustMechanismType, ResistanceType } from './authorityTypes'
import type { EvidenceOpportunity, EvidenceType, IntegrationRole } from '@/lib/evidence/evidenceTypes'

export class AuthorityParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message)
    this.name = 'AuthorityParseError'
  }
}

const NATIVE_AUTHORITY_SOURCES: NativeAuthoritySource[] = [
  'operational_experience', 'research_depth', 'historical_knowledge',
  'strategic_pattern_recognition', 'technical_expertise', 'cultural_positioning',
  'founder_experience',
]

const TRUST_MECHANISM_TYPES: TrustMechanismType[] = [
  'lived_experience', 'operational_specificity', 'strategic_vulnerability',
  'earned_authority', 'pattern_recognition', 'evidence_backing',
  'historical_reference', 'conviction_calibration', 'expert_language',
  'comparative_reasoning',
]

const RESISTANCE_TYPES: ResistanceType[] = [
  'unsupported_claim', 'premature_conclusion', 'generic_language',
  'overconfidence', 'lack_of_evidence', 'vague_abstraction',
  'weak_operational_depth', 'contrarian_without_support',
]

const EVIDENCE_TYPES: EvidenceType[] = [
  'market_data', 'research', 'historical', 'operational',
  'industry_report', 'benchmark', 'behavioral', 'comparative',
]

const INTEGRATION_ROLES: IntegrationRole[] = [
  'hook', 'support', 'contrast', 'credibility_anchor', 'historical_context',
]

function extractJson(raw: string): unknown {
  // Strip markdown fences
  const stripped = raw.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new AuthorityParseError('No JSON object found', raw)
  return JSON.parse(stripped.slice(start, end + 1))
}

function coerceNativeSource(val: unknown): NativeAuthoritySource {
  if (typeof val === 'string' && NATIVE_AUTHORITY_SOURCES.includes(val as NativeAuthoritySource)) {
    return val as NativeAuthoritySource
  }
  return 'operational_experience'
}

export function parseAuthorityAnalysis(raw: string): {
  nativeAuthoritySource: NativeAuthoritySource
  trustMechanisms: AuthorityOutput['trustMechanisms']
  resistancePoints: AuthorityOutput['resistancePoints']
  unsupportedClaims: AuthorityOutput['unsupportedClaims']
  weakAuthorityClaims: AuthorityOutput['weakAuthorityClaims']
  evidenceOpportunities: EvidenceOpportunity[]
  confidenceCalibration: string
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw) as Record<string, unknown>
  } catch {
    throw new AuthorityParseError('Failed to parse authority analysis JSON', raw)
  }

  const nativeAuthoritySource = coerceNativeSource(obj.nativeAuthoritySource)

  const trustMechanisms = (Array.isArray(obj.trustMechanisms) ? obj.trustMechanisms : [])
    .map((m: Record<string, unknown>) => ({
      type: TRUST_MECHANISM_TYPES.includes(m.type as TrustMechanismType)
        ? (m.type as TrustMechanismType)
        : 'earned_authority' as TrustMechanismType,
      observation: String(m.observation ?? ''),
      interpretation: String(m.interpretation ?? ''),
      strength: Math.max(0, Math.min(1, Number(m.strength ?? 0.5))),
      confidence: Math.max(0, Math.min(1, Number(m.confidence ?? 0.5))),
    }))
    .filter((m) => m.confidence >= 0.4)

  const resistancePoints = (Array.isArray(obj.resistancePoints) ? obj.resistancePoints : [])
    .map((r: Record<string, unknown>) => ({
      type: RESISTANCE_TYPES.includes(r.type as ResistanceType)
        ? (r.type as ResistanceType)
        : 'vague_abstraction' as ResistanceType,
      explanation: String(r.explanation ?? ''),
      severity: Math.max(0, Math.min(1, Number(r.severity ?? 0.5))),
    }))

  const unsupportedClaims = (Array.isArray(obj.unsupportedClaims) ? obj.unsupportedClaims : [])
    .map((c: Record<string, unknown>) => ({
      claim: String(c.claim ?? ''),
      reason: String(c.reason ?? ''),
      severity: Math.max(0, Math.min(1, Number(c.severity ?? 0.5))),
    }))

  const weakAuthorityClaims = (Array.isArray(obj.weakAuthorityClaims) ? obj.weakAuthorityClaims : [])
    .map((c: Record<string, unknown>) => ({
      claim: String(c.claim ?? ''),
      weakness: RESISTANCE_TYPES.includes(c.weakness as ResistanceType)
        ? (c.weakness as ResistanceType)
        : 'vague_abstraction' as ResistanceType,
      explanation: String(c.explanation ?? ''),
      severity: Math.max(0, Math.min(1, Number(c.severity ?? 0.5))),
    }))

  const evidenceOpportunities = (Array.isArray(obj.evidenceOpportunities) ? obj.evidenceOpportunities : [])
    .map((o: Record<string, unknown>, i: number) => ({
      originalClaim: String(o.originalClaim ?? ''),
      reasonEvidenceWouldHelp: String(o.reasonEvidenceWouldHelp ?? ''),
      recommendedEvidenceType: EVIDENCE_TYPES.includes(o.recommendedEvidenceType as EvidenceType)
        ? (o.recommendedEvidenceType as EvidenceType)
        : 'research' as EvidenceType,
      recommendedIntegrationRole: INTEGRATION_ROLES.includes(o.recommendedIntegrationRole as IntegrationRole)
        ? (o.recommendedIntegrationRole as IntegrationRole)
        : 'support' as IntegrationRole,
      priority: typeof o.priority === 'number' ? o.priority : i + 1,
    }))

  return {
    nativeAuthoritySource,
    trustMechanisms,
    resistancePoints,
    unsupportedClaims,
    weakAuthorityClaims,
    evidenceOpportunities,
    confidenceCalibration: String(obj.confidenceCalibration ?? ''),
  }
}

export function parseRewriteResponse(raw: string): {
  rewrittenContent: string
  credibilityDensityNote: string
  evidenceContributions: Array<{ index: number; score: number }>
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw) as Record<string, unknown>
  } catch {
    throw new AuthorityParseError('Failed to parse rewrite JSON', raw)
  }

  return {
    rewrittenContent: String(obj.rewrittenContent ?? ''),
    credibilityDensityNote: String(obj.credibilityDensityNote ?? ''),
    evidenceContributions: Array.isArray(obj.evidenceContributions)
      ? (obj.evidenceContributions as Array<Record<string, unknown>>).map((c) => ({
          index: Number(c.index ?? 0),
          score: Math.max(0, Math.min(1, Number(c.score ?? 0))),
        }))
      : [],
  }
}
