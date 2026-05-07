export type IncentiveType =
  | 'economic'
  | 'status'
  | 'institutional'
  | 'political'
  | 'career'
  | 'algorithmic'
  | 'social'
  | 'reputational'
  | 'operational'
  | 'legal'

export type IncentiveStrength =
  | 'weak'
  | 'moderate'
  | 'strong'
  | 'dominant'

export type IncentiveAlignment =
  | 'aligned'
  | 'partially_aligned'
  | 'misaligned'
  | 'conflicted'

export interface IncentiveActor {
  actor: string
  incentiveType: IncentiveType
  optimizationTarget: string
  pressureSource: string
  strength: IncentiveStrength
}

export interface IncentiveConflict {
  actorA: string
  actorB: string
  conflict: string
  consequence: string
}

export interface IncentiveObservation {
  actor: string
  observedBehavior: string
  likelyIncentive: string
  confidence: number  // 0–1; suppress below 0.4
}

export interface IncentiveScoreBreakdown {
  structuralDepth: number     // 0–1
  causalClarity: number       // 0–1
  nuance: number              // 0–1
  mechanismStrength: number   // 0–1
  epistemicBalance: number    // 0–1; rewards calibrated interpretation, penalizes monocausal framing
}

export interface IncentiveOutput {
  incentiveScore: number
  scoreBreakdown: IncentiveScoreBreakdown

  primaryIncentive: string

  actors: IncentiveActor[]

  // Present only when genuine incentive misalignment exists between actors.
  // Absence is meaningful — not all systems have conflicting incentives.
  conflicts?: IncentiveConflict[]

  observations: IncentiveObservation[]

  alignment: IncentiveAlignment

  // Present only when a non-obvious tradeoff is structurally evidenced.
  // Absence is meaningful — not all systems have hidden tradeoffs.
  hiddenTradeoff?: string

  // Present only when a system-level pressure shapes the whole incentive structure.
  // Absence is meaningful — not all content reveals systemic pressure.
  systemPressure?: string

  rewrittenContent: string
  incentiveSummary: string       // 2–3 sentences distilling the structural incentive picture
  strategicImplication: string   // who should act, and how — specific, not generic

  generationMetadata: {
    model: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    generatedAt: string
  }
}

export const INCENTIVE_CONTENT_TYPE = 'incentive' as const
