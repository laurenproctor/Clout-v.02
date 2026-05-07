import type {
  IncentiveActor,
  IncentiveConflict,
  IncentiveObservation,
  IncentiveScoreBreakdown,
  IncentiveStrength,
} from './incentiveTypes'

const WEIGHTS: Record<keyof IncentiveScoreBreakdown, number> = {
  structuralDepth: 0.25,
  causalClarity: 0.20,
  nuance: 0.20,
  mechanismStrength: 0.20,
  epistemicBalance: 0.15,
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

const STRENGTH_VALUE: Record<IncentiveStrength, number> = {
  dominant: 1.0,
  strong: 0.75,
  moderate: 0.5,
  weak: 0.25,
}

export function scoreIncentive(analysis: {
  actors: IncentiveActor[]
  conflicts: IncentiveConflict[] | undefined
  observations: IncentiveObservation[]
  hiddenTradeoff: string | undefined
  systemPressure: string | undefined
  alignment: string
}): { score: number; breakdown: IncentiveScoreBreakdown } {
  const { actors, conflicts, observations, hiddenTradeoff, systemPressure } = analysis

  // structuralDepth: system-level pressure + actor type diversity + conflict presence
  const uniqueIncentiveTypes = new Set(actors.map((a) => a.incentiveType)).size
  const typeDiversity = Math.min(1, uniqueIncentiveTypes / 4)  // 4+ types = full diversity
  const systemPressureBonus = systemPressure ? 0.2 : 0
  const conflictBonus = conflicts && conflicts.length > 0 ? 0.15 : 0
  const structuralDepth = Math.min(1,
    (actors.length > 0 ? 0.4 + typeDiversity * 0.25 : 0.2) + systemPressureBonus + conflictBonus
  )

  // causalClarity: observation confidence + tradeoff presence + non-empty pressureSources
  const observationClarity = observations.length > 0
    ? avg(observations.map((o) => o.confidence))
    : 0.3
  const tradeoffBonus = hiddenTradeoff ? 0.15 : 0
  const actorsWithPressure = actors.filter((a) => a.pressureSource.length > 15).length
  const pressureBonus = actors.length > 0 ? (actorsWithPressure / actors.length) * 0.2 : 0
  const causalClarity = Math.min(1, observationClarity * 0.65 + tradeoffBonus + pressureBonus)

  // nuance: mixed incentive strengths + alignment not flatly misaligned + conflicts with consequences
  const strengthValues = actors.map((a) => STRENGTH_VALUE[a.strength])
  const strengthVariance = strengthValues.length > 1
    ? Math.sqrt(avg(strengthValues.map((v) => Math.pow(v - avg(strengthValues), 2))))
    : 0
  const alignmentNuanceBonus = analysis.alignment !== 'misaligned' ? 0.15 : 0
  const conflictQuality = conflicts
    ? avg(conflicts.map((c) => c.consequence.length > 20 ? 0.8 : 0.4))
    : 0
  const nuanceBase = actors.length > 0
    ? Math.min(1, 0.3 + strengthVariance * 0.5 + alignmentNuanceBonus + conflictQuality * 0.15)
    : 0.2
  const nuance = Math.max(0.2, Math.min(1, nuanceBase))

  // mechanismStrength: avg actor strength weighted by specificity of optimizationTarget
  const actorMechanismScores = actors.map((a) => {
    const strengthScore = STRENGTH_VALUE[a.strength]
    const specificityBonus = a.optimizationTarget.length > 30 ? 0.15 : 0
    return Math.min(1, strengthScore + specificityBonus)
  })
  const mechanismBase = actors.length > 0
    ? avg(actorMechanismScores) * 0.7 + (systemPressure ? 0.3 : 0)
    : 0.2
  const mechanismStrength = Math.max(0.2, Math.min(1, mechanismBase))

  // epistemicBalance: penalize monoculture (all economic) and reward mixed incentive types
  const allEconomic = actors.length > 0 && actors.every((a) => a.incentiveType === 'economic')
  const monoculturePenalty = allEconomic ? -0.3 : 0
  const typeMixBonus = Math.min(0.4, (uniqueIncentiveTypes - 1) * 0.1)
  // aligned systems get a small reward — recognizing alignment requires calibration too
  const alignmentBonus = analysis.alignment === 'aligned' ? 0.1 : 0
  const epistemicBase = 0.5 + typeMixBonus + monoculturePenalty + alignmentBonus
  const epistemicBalance = Math.max(0.1, Math.min(1, epistemicBase))

  const breakdown: IncentiveScoreBreakdown = {
    structuralDepth,
    causalClarity,
    nuance,
    mechanismStrength,
    epistemicBalance,
  }

  const score = Math.round(
    Object.entries(breakdown).reduce(
      (total, [key, val]) => total + val * WEIGHTS[key as keyof IncentiveScoreBreakdown] * 100,
      0
    )
  )

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}
