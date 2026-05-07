import type {
  ClichePattern,
  RestraintOpportunity,
  CulturalPrecision,
  EmotionalTexture,
  TasteAnchor,
  TasteScoreBreakdown,
} from './tasteTypes'

const WEIGHTS: Record<keyof TasteScoreBreakdown, number> = {
  restraint: 0.15,
  specificity: 0.15,
  originality: 0.15,
  rhythm: 0.10,
  emotionalCalibration: 0.15,
  conceptualElegance: 0.15,
  aestheticConsistency: 0.10,
  memorability: 0.05,
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

// Higher when fewer/less severe restraint issues. Penalizes each issue proportionally.
function scoreRestraint(opportunities: RestraintOpportunity[]): number {
  if (opportunities.length === 0) return 0.85
  const penalty = Math.min(0.6, opportunities.length * 0.12)
  return Math.max(0.2, 0.85 - penalty)
}

// Derived from avg culturalPrecision.specificity. Falls back to midpoint when none detected.
function scoreSpecificity(precision: CulturalPrecision[]): number {
  if (precision.length === 0) return 0.4
  return Math.min(1, avg(precision.map((p) => p.specificity)) * 1.1)
}

// Inversely proportional to cliché density and severity.
function scoreOriginality(cliches: ClichePattern[]): number {
  if (cliches.length === 0) return 0.85
  const avgSeverity = avg(cliches.map((c) => c.severity))
  const densityPenalty = Math.min(0.5, cliches.length * 0.08)
  return Math.max(0.15, 0.85 - avgSeverity * 0.4 - densityPenalty)
}

// Emotional consistency is the best available proxy for rhythm from structured output.
function scoreRhythm(texture: EmotionalTexture): number {
  return Math.max(0.2, texture.consistency * 0.9)
}

// Direct from emotional texture consistency — how controlled the emotional register is.
function scoreEmotionalCalibration(texture: EmotionalTexture): number {
  const postureBonus = (texture.emotionalPosture === 'measured' || texture.emotionalPosture === 'restrained')
    ? 0.05 : 0
  return Math.min(1, texture.consistency * 0.95 + postureBonus)
}

// Low cliché severity + high cultural precision authenticity = conceptual elegance.
function scoreConceptualElegance(cliches: ClichePattern[], precision: CulturalPrecision[]): number {
  const clichePenalty = cliches.length > 0 ? avg(cliches.map((c) => c.severity)) * 0.35 : 0
  const authenticityBonus = precision.length > 0 ? avg(precision.map((p) => p.authenticity)) * 0.4 : 0
  return Math.max(0.2, Math.min(1, 0.6 - clichePenalty + authenticityBonus))
}

// Coherent emotional texture + low tonal fragmentation from restraint issues.
function scoreAestheticConsistency(texture: EmotionalTexture, opportunities: RestraintOpportunity[]): number {
  const fragmentationPenalty = opportunities.filter(
    (r) => r.issue === 'forced_sophistication' || r.issue === 'symbolic_overload'
  ).length * 0.1
  return Math.max(0.2, Math.min(1, texture.consistency * 0.85 - fragmentationPenalty))
}

// Anchors boost memorability directly — high-distinctiveness anchors signal identity gravity.
function scoreMemorability(
  precision: CulturalPrecision[],
  anchors: TasteAnchor[],
  strongestLine: string,
  cliches: ClichePattern[]
): number {
  const lineBonus = strongestLine.length > 20 ? 0.15 : 0
  const precisionBonus = Math.min(0.2, precision.length * 0.06)
  const anchorBonus = anchors.length > 0 ? Math.min(0.2, avg(anchors.map((a) => a.distinctiveness)) * 0.25) : 0
  const clichePenalty = avg(cliches.map((c) => c.severity)) * 0.2
  return Math.max(0.2, Math.min(1, 0.5 + lineBonus + precisionBonus + anchorBonus - clichePenalty))
}

export function scoreTaste(analysis: {
  clichePatterns: ClichePattern[]
  restraintOpportunities: RestraintOpportunity[]
  culturalPrecision: CulturalPrecision[]
  emotionalTexture: EmotionalTexture
  tasteAnchors: TasteAnchor[]
  strongestLine: string
}): { score: number; breakdown: TasteScoreBreakdown } {
  const { clichePatterns, restraintOpportunities, culturalPrecision, emotionalTexture, tasteAnchors, strongestLine } = analysis

  const breakdown: TasteScoreBreakdown = {
    restraint: scoreRestraint(restraintOpportunities),
    specificity: scoreSpecificity(culturalPrecision),
    originality: scoreOriginality(clichePatterns),
    rhythm: scoreRhythm(emotionalTexture),
    emotionalCalibration: scoreEmotionalCalibration(emotionalTexture),
    conceptualElegance: scoreConceptualElegance(clichePatterns, culturalPrecision),
    aestheticConsistency: scoreAestheticConsistency(emotionalTexture, restraintOpportunities),
    memorability: scoreMemorability(culturalPrecision, tasteAnchors, strongestLine, clichePatterns),
  }

  const score = Math.round(
    Object.entries(breakdown).reduce(
      (total, [key, val]) => total + val * WEIGHTS[key as keyof TasteScoreBreakdown] * 100,
      0
    )
  )

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}
