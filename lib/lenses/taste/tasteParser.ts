import type {
  ClichePattern,
  RestraintOpportunity,
  CulturalPrecision,
  EmotionalTexture,
  TasteAnchor,
} from './tasteTypes'

export class TasteParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message)
    this.name = 'TasteParseError'
  }
}

const RESTRAINT_ISSUES: RestraintOpportunity['issue'][] = [
  'overexplaining', 'overstating', 'emotional_excess',
  'forced_sophistication', 'generic_emphasis', 'symbolic_overload',
]

const EMOTIONAL_POSTURES: EmotionalTexture['emotionalPosture'][] = [
  'restrained', 'warm', 'sharp', 'reflective', 'urgent', 'measured', 'playful',
]

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new TasteParseError('No JSON object found', raw)
  return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
}

function clamp(v: unknown, fallback = 0.5): number {
  return Math.max(0, Math.min(1, typeof v === 'number' ? v : fallback))
}

export function parseTasteAnalysis(raw: string): {
  clichePatterns: ClichePattern[]
  restraintOpportunities: RestraintOpportunity[]
  culturalPrecision: CulturalPrecision[]
  emotionalTexture: EmotionalTexture
  tasteAnchors: TasteAnchor[]
  strongestLine: string
  tasteSummary: string
  refinementNote: string
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new TasteParseError('Failed to parse taste analysis JSON', raw)
  }

  const clichePatterns: ClichePattern[] = (
    Array.isArray(obj.clichePatterns) ? obj.clichePatterns : []
  )
    .map((c: Record<string, unknown>) => ({
      phrase: String(c.phrase ?? ''),
      reasonWeak: String(c.reasonWeak ?? ''),
      severity: clamp(c.severity),
      replacementStrategy: typeof c.replacementStrategy === 'string' && c.replacementStrategy.length > 5
        ? c.replacementStrategy
        : undefined,
    }))
    .filter((c) => c.severity >= 0.3)

  const restraintOpportunities: RestraintOpportunity[] = (
    Array.isArray(obj.restraintOpportunities) ? obj.restraintOpportunities : []
  ).map((r: Record<string, unknown>) => ({
    section: String(r.section ?? ''),
    issue: RESTRAINT_ISSUES.includes(r.issue as RestraintOpportunity['issue'])
      ? (r.issue as RestraintOpportunity['issue'])
      : 'overexplaining' as RestraintOpportunity['issue'],
    recommendation: String(r.recommendation ?? ''),
  }))

  const culturalPrecision: CulturalPrecision[] = (
    Array.isArray(obj.culturalPrecision) ? obj.culturalPrecision : []
  ).map((p: Record<string, unknown>) => ({
    signal: String(p.signal ?? ''),
    specificity: clamp(p.specificity),
    authenticity: clamp(p.authenticity),
    explanation: String(p.explanation ?? ''),
  }))

  const rawTexture = (obj.emotionalTexture ?? {}) as Record<string, unknown>
  const emotionalTexture: EmotionalTexture = {
    emotionalPosture: EMOTIONAL_POSTURES.includes(rawTexture.emotionalPosture as EmotionalTexture['emotionalPosture'])
      ? (rawTexture.emotionalPosture as EmotionalTexture['emotionalPosture'])
      : 'measured',
    consistency: clamp(rawTexture.consistency),
    explanation: String(rawTexture.explanation ?? ''),
  }

  const tasteAnchors: TasteAnchor[] = (
    Array.isArray(obj.tasteAnchors) ? obj.tasteAnchors : []
  )
    .map((a: Record<string, unknown>) => ({
      element: String(a.element ?? ''),
      reasonPreserve: String(a.reasonPreserve ?? ''),
      distinctiveness: clamp(a.distinctiveness),
    }))
    .filter((a) => a.distinctiveness >= 0.4 && a.element.length > 5)

  return {
    clichePatterns,
    restraintOpportunities,
    culturalPrecision,
    emotionalTexture,
    tasteAnchors,
    strongestLine: String(obj.strongestLine ?? ''),
    tasteSummary: String(obj.tasteSummary ?? ''),
    refinementNote: String(obj.refinementNote ?? ''),
  }
}

export function parseTasteRewrite(raw: string): { rewrittenContent: string } {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new TasteParseError('Failed to parse taste rewrite JSON', raw)
  }
  return { rewrittenContent: String(obj.rewrittenContent ?? '') }
}
