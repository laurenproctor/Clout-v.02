export type SignalSourceType =
  | 'behavioral'      // changes in how people act
  | 'economic'        // changes in where money flows or incentives point
  | 'cultural'        // changes in what is valued or normalized
  | 'technological'   // capability shifts enabling new behaviors
  | 'regulatory'      // institutional or policy-driven transitions
  | 'organizational'  // structural changes inside companies or industries

export type SignalMaturity =
  | 'fragmented'       // present but scattered; not yet coherent
  | 'emerging'         // coalescing; pattern becoming legible
  | 'consolidating'    // compressing into clear category
  | 'institutionalized' // mainstream; late-stage signal

export interface WeakSignal {
  signal: string
  whyItMatters: string
  confidence: number        // 0–1; suppress below 0.4
  momentum: number          // 0–1; how fast is this becoming a strong signal?
  sourceType: SignalSourceType
  // maturity ≠ velocity: a signal can be mature but stagnant, or fragmented but compounding
  maturity: SignalMaturity
}

export interface DirectionalShift {
  shift: string
  previousState: string    // the from state — explicit, not vague
  emergingState: string    // the toward state — explicit, not vague
  timeframe: 'emerging' | 'accelerating' | 'mainstreaming' | 'late_stage'
}

export interface StructuralTransition {
  transition: string
  driver: string            // the mechanism causing the transition
  implication: string
  severity: number          // 0–1
}

export interface IncentiveChange {
  oldIncentive: string
  newIncentive: string
  affectedGroups: string[]
}

export interface FutureImplication {
  implication: string
  timeframe: 'short_term' | 'medium_term' | 'long_term'
  likelihood: number        // 0–1
}

export interface SignalStrength {
  relevance: number
  novelty: number
  directionalClarity: number
  strategicImportance: number
  momentum: number
}

// Distinguishes real signals from noise masquerading as signal.
// Presence is a calibration flag — not a disqualifier.
// Absence means the signal passed structural durability assessment.
export interface SignalRisk {
  falseSignalRisk: number  // 0–1; high = likely noise, amplification, or cyclical spike
  reason: string           // why this may not have structural durability
}

export interface SignalOutput {
  signalScore: number
  scoreBreakdown: SignalStrength

  strongestSignal: string

  weakSignals: WeakSignal[]
  directionalShifts: DirectionalShift[]
  structuralTransitions: StructuralTransition[]
  incentiveChanges: IncentiveChange[]
  futureImplications: FutureImplication[]

  // Present only when the signal may lack structural durability (falseSignalRisk > 0.5).
  // Absence is meaningful — it means the signal passed.
  signalRisk?: SignalRisk

  // Present only when a genuine adaptation gap exists between signal strength and current consensus.
  // This is where directional leverage lives: correct signals where institutions haven't caught up.
  // Absence is meaningful — not all correct signals create strategic advantage.
  signalAsymmetry?: string

  rewrittenContent: string
  signalSummary: string       // 2–3 sentences distilling the directional picture
  strategicImplication: string // who should act, and how — specific, not generic

  generationMetadata: {
    model: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    generatedAt: string
  }
}

export const SIGNAL_CONTENT_TYPE = 'signal' as const
