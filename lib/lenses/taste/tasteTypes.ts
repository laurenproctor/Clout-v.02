export interface ClichePattern {
  phrase: string
  reasonWeak: string
  severity: number           // 0–1; suppress below 0.3
  replacementStrategy?: string
}

export interface RestraintOpportunity {
  section: string
  issue:
    | 'overexplaining'
    | 'overstating'
    | 'emotional_excess'
    | 'forced_sophistication'
    | 'generic_emphasis'
    | 'symbolic_overload'
  recommendation: string
}

export interface CulturalPrecision {
  signal: string
  specificity: number        // 0–1
  authenticity: number       // 0–1
  explanation: string
}

export interface EmotionalTexture {
  emotionalPosture:
    | 'restrained'
    | 'warm'
    | 'sharp'
    | 'reflective'
    | 'urgent'
    | 'measured'
    | 'playful'
  consistency: number        // 0–1
  explanation: string
}

export interface TasteAnchor {
  element: string           // verbatim or close paraphrase from the content
  reasonPreserve: string    // why this creates identity gravity — not just "it's good"
  distinctiveness: number   // 0–1; how specific to this creator's voice
}

export interface TasteScoreBreakdown {
  restraint: number
  specificity: number
  originality: number
  rhythm: number
  emotionalCalibration: number
  conceptualElegance: number
  aestheticConsistency: number
  memorability: number
}

export interface TasteOutput {
  tasteScore: number
  scoreBreakdown: TasteScoreBreakdown

  clichePatterns: ClichePattern[]
  restraintOpportunities: RestraintOpportunity[]
  culturalPrecision: CulturalPrecision[]
  emotionalTexture: EmotionalTexture

  // Elements that must survive refinement — identity gravity, productive asymmetry,
  // memorable imperfection. Presence is meaningful; absence means no clear anchors detected.
  tasteAnchors: TasteAnchor[]

  rewrittenContent: string

  strongestLine: string
  tasteSummary: string
  refinementNote: string

  generationMetadata: {
    model: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    generatedAt: string
  }
}

export const TASTE_CONTENT_TYPE = 'taste' as const
