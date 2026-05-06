import type {
  ContrarianOutput,
  ContrarianScoreBreakdown,
  HiddenAssumption,
  ReversalMechanism,
  SecondOrderEffect,
  TensionPoint,
} from './contrarianTypes'

const WEIGHTS: Record<keyof ContrarianScoreBreakdown, number> = {
  originality: 0.16,
  explanatoryPower: 0.16,
  structuralInsight: 0.15,
  asymmetryStrength: 0.14,
  tensionQuality: 0.13,
  convictionCalibration: 0.12,
  evidenceAlignment: 0.08,
  distinctionStrength: 0.06,
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export function scoreContrarian(analysis: {
  hiddenAssumptions: HiddenAssumption[]
  reversalMechanisms: ReversalMechanism[]
  secondOrderEffects: SecondOrderEffect[]
  tensionPoints: TensionPoint[]
  strongestAsymmetry: string
  distinctionNote: string
}): { score: number; breakdown: ContrarianScoreBreakdown } {
  const {
    hiddenAssumptions,
    reversalMechanisms,
    secondOrderEffects,
    tensionPoints,
    strongestAsymmetry,
    distinctionNote,
  } = analysis

  // originality: driven by hidden assumption confidence and reversal mechanism strength
  const assumptionSignal = avg(hiddenAssumptions.map((a) => a.confidence))
  const reversalSignal = avg(reversalMechanisms.map((r) => r.strength))
  const originality = Math.min(1,
    assumptionSignal * 0.55 +
    (reversalMechanisms.length > 0 ? reversalSignal * 0.45 : 0.15)
  )

  // explanatoryPower: are mechanisms present and specific?
  const hasMechanisms = reversalMechanisms.length > 0 || hiddenAssumptions.length > 0
  const mechanismDepth = avg([
    ...reversalMechanisms.map((r) => r.strength),
    ...hiddenAssumptions.map((a) => a.confidence),
  ])
  const explanatoryPower = hasMechanisms
    ? Math.min(1, 0.3 + mechanismDepth * 0.7)
    : 0.2

  // structuralInsight: second-order effects with causal chains + hidden assumptions
  const soeSignal = secondOrderEffects.length > 0
    ? Math.min(1, 0.4 + secondOrderEffects.length * 0.15)
    : 0.2
  const structuralInsight = Math.min(1, soeSignal * 0.6 + assumptionSignal * 0.4)

  // asymmetryStrength: strongest asymmetry — non-empty and distinct from generic
  const hasAsymmetry = strongestAsymmetry.length > 20
  const asymmetryStrength = hasAsymmetry
    ? Math.min(1, 0.5 + reversalSignal * 0.3 + assumptionSignal * 0.2)
    : 0.2

  // tensionQuality: tension points with high distinction + moderate resistance
  const tensionSignal = tensionPoints.length > 0
    ? avg(tensionPoints.map((t) => {
        // Productive tension: meaningful distinction + some resistance (not zero, not max)
        const resistanceBalance = 1 - Math.abs(t.resistanceLikelihood - 0.6)
        return (t.whyItCreatesDistinction.length > 30 ? 0.6 : 0.3) + resistanceBalance * 0.4
      }))
    : 0.2
  const tensionQuality = Math.min(1, tensionSignal)

  // convictionCalibration: confidence values spread across the range (not all 0.9, not all 0.5)
  const allConfidences = [
    ...hiddenAssumptions.map((a) => a.confidence),
    ...reversalMechanisms.map((r) => r.strength),
  ]
  let convictionCalibration = 0.5
  if (allConfidences.length > 0) {
    const mean = avg(allConfidences)
    const variance = avg(allConfidences.map((c) => Math.pow(c - mean, 2)))
    // Reward for having varied confidence levels (calibration) and not being max-confident
    const overconfidencePenalty = allConfidences.filter((c) => c >= 0.95).length * 0.1
    convictionCalibration = Math.max(0, Math.min(1, 0.4 + variance * 2 + mean * 0.3 - overconfidencePenalty))
  }

  // evidenceAlignment: does the distinctionNote suggest earned vs performed contrarianism?
  // Heuristic: if distinctionNote contains "performed", "shallow", "forced" → penalize
  const performanceMarkers = ['perform', 'shallow', 'forced', 'unnecessary', 'without mechanism']
  const performancePenalty = performanceMarkers.filter((m) => distinctionNote.toLowerCase().includes(m)).length * 0.12
  const evidenceAlignment = Math.max(0, Math.min(1, 0.7 - performancePenalty + reversalSignal * 0.3))

  // distinctionStrength: combination of asymmetry clarity + tension depth
  const distinctionStrength = Math.min(1,
    (hasAsymmetry ? 0.4 : 0.1) +
    (tensionPoints.length > 0 ? tensionQuality * 0.35 : 0) +
    (secondOrderEffects.length >= 2 ? 0.25 : secondOrderEffects.length * 0.1)
  )

  const breakdown: ContrarianScoreBreakdown = {
    originality,
    explanatoryPower,
    structuralInsight,
    asymmetryStrength,
    tensionQuality,
    convictionCalibration,
    evidenceAlignment,
    distinctionStrength,
  }

  const score = Math.round(
    Object.entries(breakdown).reduce(
      (total, [key, val]) => total + val * WEIGHTS[key as keyof ContrarianScoreBreakdown] * 100,
      0
    )
  )

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}
