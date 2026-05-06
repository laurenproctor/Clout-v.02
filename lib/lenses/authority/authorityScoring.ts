import type { AuthorityOutput, AuthorityScoreBreakdown } from './authorityTypes'
import type { Evidence } from '@/lib/evidence/evidenceTypes'

const WEIGHTS: Record<keyof AuthorityScoreBreakdown, number> = {
  credibility: 0.15,
  specificity: 0.14,
  evidenceQuality: 0.13,
  operationalDepth: 0.13,
  confidenceCalibration: 0.12,
  patternRecognition: 0.10,
  trustSequencing: 0.10,
  authorityCoherence: 0.08,
  authorityConsistency: 0.05,
}

function avgStrength(signals: { strength: number; confidence: number }[]): number {
  if (signals.length === 0) return 0
  const total = signals.reduce((s, m) => s + m.strength * m.confidence, 0)
  const weight = signals.reduce((s, m) => s + m.confidence, 0)
  return weight > 0 ? total / weight : 0
}

export function scoreAuthority(
  analysis: Pick<AuthorityOutput, 'trustMechanisms' | 'resistancePoints' | 'unsupportedClaims' | 'weakAuthorityClaims'>,
  evidence: Evidence[]
): { score: number; breakdown: AuthorityScoreBreakdown } {
  const { trustMechanisms, resistancePoints, unsupportedClaims, weakAuthorityClaims } = analysis

  const authoritySignals = trustMechanisms.filter((m) =>
    ['earned_authority', 'evidence_backing', 'lived_experience'].includes(m.type)
  )
  const unsupportedPenalty = Math.min(unsupportedClaims.reduce((s, c) => s + c.severity, 0) * 0.15, 0.4)
  const overconfidencePenalty = resistancePoints.filter((r) => r.type === 'overconfidence')
    .reduce((s, r) => s + r.severity, 0) * 0.1
  const credibility = Math.max(0, Math.min(1,
    avgStrength(authoritySignals) * 0.7 + 0.3 - unsupportedPenalty - overconfidencePenalty
  ))

  const specificitySignals = trustMechanisms.filter((m) =>
    ['operational_specificity', 'lived_experience', 'expert_language'].includes(m.type)
  )
  const abstractionPenalty = weakAuthorityClaims
    .filter((c) => ['vague_abstraction', 'generic_language'].includes(c.weakness))
    .reduce((s, c) => s + c.severity, 0) * 0.15
  const specificity = Math.max(0, Math.min(1,
    avgStrength(specificitySignals) * 0.8 + 0.2 - abstractionPenalty
  ))

  // evidenceQuality: 0 when no evidence — no penalty, no reward
  let evidenceQuality = 0
  if (evidence.length > 0) {
    const avgConf = evidence.reduce((s, e) => s + e.confidence, 0) / evidence.length
    const avgFresh = evidence.reduce((s, e) => s + e.freshnessScore, 0) / evidence.length
    const uniqueDomains = new Set(
      evidence.map((e) => { try { return new URL(e.sourceUrl!).hostname } catch { return e.source } })
    ).size
    const diversity = uniqueDomains / evidence.length
    evidenceQuality = Math.min(1, avgConf * 0.4 + avgFresh * 0.3 + diversity * 0.3)
  }

  const operationalSignals = trustMechanisms.filter((m) =>
    ['lived_experience', 'operational_specificity', 'pattern_recognition', 'comparative_reasoning'].includes(m.type)
  )
  const operationalPenalty = resistancePoints
    .filter((r) => r.type === 'weak_operational_depth')
    .reduce((s, r) => s + r.severity, 0) * 0.2
  const operationalDepth = Math.max(0, Math.min(1,
    avgStrength(operationalSignals) * 0.9 + 0.1 - operationalPenalty
  ))

  const calibrationSignals = trustMechanisms.filter((m) => m.type === 'conviction_calibration')
  const calibrationPenalty = resistancePoints
    .filter((r) => r.type === 'overconfidence' || r.type === 'premature_conclusion')
    .reduce((s, r) => s + r.severity, 0) * 0.15
  const confidenceCalibration = Math.max(0, Math.min(1,
    (calibrationSignals.length > 0 ? avgStrength(calibrationSignals) : 0.5) - calibrationPenalty
  ))

  const patternSignals = trustMechanisms.filter((m) =>
    ['pattern_recognition', 'comparative_reasoning', 'historical_reference'].includes(m.type)
  )
  const patternRecognition = Math.max(0, Math.min(1,
    patternSignals.length > 0 ? avgStrength(patternSignals) : 0.2
  ))

  const sequencingSignals = trustMechanisms.filter((m) =>
    ['earned_authority', 'strategic_vulnerability', 'conviction_calibration'].includes(m.type)
  )
  const sequencingPenalty = resistancePoints
    .filter((r) => r.type === 'premature_conclusion')
    .reduce((s, r) => s + r.severity, 0) * 0.2
  const trustSequencing = Math.max(0, Math.min(1,
    (sequencingSignals.length > 0 ? avgStrength(sequencingSignals) : 0.5) - sequencingPenalty
  ))

  // authorityCoherence: guards worldview continuity, tonal consistency, register stability
  const coherencePenalty = resistancePoints
    .filter((r) => ['generic_language', 'vague_abstraction', 'overconfidence'].includes(r.type))
    .reduce((s, r) => s + r.severity, 0) * 0.1
  const weaknessPenalty = weakAuthorityClaims.length * 0.05
  const authorityCoherence = Math.max(0, Math.min(1,
    0.8 - coherencePenalty - weaknessPenalty
  ))

  // authorityConsistency: stable expertise signaling throughout
  const consistencyPenalty = (unsupportedClaims.length + weakAuthorityClaims.length) * 0.04
  const authorityConsistency = Math.max(0, Math.min(1, 0.85 - consistencyPenalty))

  const breakdown: AuthorityScoreBreakdown = {
    credibility,
    specificity,
    evidenceQuality,
    confidenceCalibration,
    operationalDepth,
    patternRecognition,
    trustSequencing,
    authorityCoherence,
    authorityConsistency,
  }

  const score = Math.round(
    Object.entries(breakdown).reduce(
      (total, [key, val]) => total + val * WEIGHTS[key as keyof AuthorityScoreBreakdown] * 100,
      0
    )
  )

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}
