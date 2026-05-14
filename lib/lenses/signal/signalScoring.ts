import type {
  SignalStrength,
  WeakSignal,
  DirectionalShift,
  StructuralTransition,
  FutureImplication,
  IncentiveChange,
} from './signalTypes'

const WEIGHTS: Record<keyof SignalStrength, number> = {
  relevance: 0.25,
  novelty: 0.20,
  directionalClarity: 0.20,
  strategicImportance: 0.20,
  momentum: 0.15,
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

const TIMEFRAME_VELOCITY: Record<DirectionalShift['timeframe'], number> = {
  emerging: 0.9,
  accelerating: 0.8,
  mainstreaming: 0.5,
  late_stage: 0.2,
}

const MATURITY_NOVELTY_BONUS: Record<WeakSignal['maturity'], number> = {
  fragmented: 0.2,
  emerging: 0.15,
  consolidating: 0,
  institutionalized: -0.15,
}

export function scoreSignal(analysis: {
  weakSignals: WeakSignal[]
  directionalShifts: DirectionalShift[]
  structuralTransitions: StructuralTransition[]
  incentiveChanges: IncentiveChange[]
  futureImplications: FutureImplication[]
}): { score: number; breakdown: SignalStrength } {
  const {
    weakSignals,
    directionalShifts,
    structuralTransitions,
    incentiveChanges,
    futureImplications,
  } = analysis

  // relevance: structural transition severity + incentive change presence
  const transitionSeverity = avg(structuralTransitions.map((t) => t.severity))
  const incentiveBonus = incentiveChanges.length > 0 ? 0.2 : 0
  const relevance = Math.min(1,
    (structuralTransitions.length > 0 ? 0.4 + transitionSeverity * 0.4 : 0.25) + incentiveBonus
  )

  // novelty: weak signal confidence weighted by maturity bonus; penalize late_stage
  const noveltyBase = weakSignals.length > 0
    ? avg(weakSignals.map((s) => s.confidence + MATURITY_NOVELTY_BONUS[s.maturity]))
    : 0.2
  const novelty = Math.max(0.2, Math.min(1, noveltyBase))

  // directionalClarity: explicit previousState/emergingState + timeframe velocity
  const clarityBase = directionalShifts.length > 0
    ? avg(directionalShifts.map((d) => {
        const hasExplicit = d.previousState.length > 10 && d.emergingState.length > 10 ? 0.6 : 0.3
        return hasExplicit + TIMEFRAME_VELOCITY[d.timeframe] * 0.4
      }))
    : 0.2
  const directionalClarity = Math.max(0.2, Math.min(1, clarityBase))

  // strategicImportance: future implication likelihood + structural transition severity
  const implLikelihood = avg(futureImplications.map((i) => i.likelihood))
  const strategicImportance = futureImplications.length > 0
    ? Math.min(1, 0.3 + implLikelihood * 0.4 + transitionSeverity * 0.3)
    : 0.2

  // momentum: average weak signal momentum + directional shift velocity bonus
  const signalMomentum = avg(weakSignals.map((s) => s.momentum))
  const shiftVelocity = directionalShifts.length > 0
    ? avg(directionalShifts.map((d) => TIMEFRAME_VELOCITY[d.timeframe]))
    : 0
  const allLateStage =
    directionalShifts.length > 0 &&
    directionalShifts.every((d) => d.timeframe === 'late_stage')
  const momentumBase = weakSignals.length > 0
    ? signalMomentum * 0.6 + shiftVelocity * 0.4
    : shiftVelocity * 0.5
  const momentum = Math.max(0, Math.min(1, momentumBase - (allLateStage ? 0.2 : 0)))

  const breakdown: SignalStrength = {
    relevance,
    novelty,
    directionalClarity,
    strategicImportance,
    momentum,
  }

  const score = Math.round(
    Object.entries(breakdown).reduce(
      (total, [key, val]) => total + val * WEIGHTS[key as keyof SignalStrength] * 100,
      0
    )
  )

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}
