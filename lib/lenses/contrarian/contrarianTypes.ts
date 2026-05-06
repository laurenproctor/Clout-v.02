export interface ConsensusFrame {
  statement: string
  confidence: number    // 0–1; how dominant is this frame in the content?
}

export interface HiddenAssumption {
  assumption: string
  whyItMatters: string
  confidence: number    // 0–1
}

export interface ReversalMechanism {
  mechanism: string
  explanation: string
  strength: number      // 0–1; how likely is this reversal to actually manifest?
}

export interface SecondOrderEffect {
  effect: string
  explanation: string
  timeframe: 'immediate' | 'medium_term' | 'long_term'
}

export interface TensionPoint {
  tension: string
  whyItCreatesDistinction: string
  resistanceLikelihood: number  // 0–1; how much pushback will this produce?
}

export interface ContrarianScoreBreakdown {
  originality: number
  explanatoryPower: number
  structuralInsight: number
  asymmetryStrength: number
  tensionQuality: number
  convictionCalibration: number
  evidenceAlignment: number
  distinctionStrength: number
}

export interface ContrarianOutput {
  contrarianScore: number
  scoreBreakdown: ContrarianScoreBreakdown

  consensusFrame: ConsensusFrame

  hiddenAssumptions: HiddenAssumption[]

  reversalMechanisms: ReversalMechanism[]

  secondOrderEffects: SecondOrderEffect[]

  tensionPoints: TensionPoint[]

  rewrittenContent: string

  // The single most powerful asymmetry — the "one-liner" insight
  strongestAsymmetry: string

  // Who resists this framing and why — grounds the tension in real audience dynamics
  resistancePrediction: string

  // System's self-assessment: is this earned contrarianism or performed?
  distinctionNote: string

  generationMetadata: {
    model: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    generatedAt: string
  }
}

export const CONTRARIAN_CONTENT_TYPE = 'contrarian' as const
