import type {
  ConsensusFrame,
  HiddenAssumption,
  ReversalMechanism,
  SecondOrderEffect,
  TensionPoint,
} from './contrarianTypes'

export class ContrarianParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message)
    this.name = 'ContrarianParseError'
  }
}

const TIMEFRAMES = ['immediate', 'medium_term', 'long_term'] as const

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new ContrarianParseError('No JSON object found', raw)
  return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
}

function clamp(v: unknown, fallback = 0.5): number {
  return Math.max(0, Math.min(1, typeof v === 'number' ? v : fallback))
}

export function parseContrarianAnalysis(raw: string): {
  consensusFrame: ConsensusFrame
  hiddenAssumptions: HiddenAssumption[]
  reversalMechanisms: ReversalMechanism[]
  secondOrderEffects: SecondOrderEffect[]
  tensionPoints: TensionPoint[]
  strongestAsymmetry: string
  resistancePrediction: string
  distinctionNote: string
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new ContrarianParseError('Failed to parse analysis JSON', raw)
  }

  const cf = (obj.consensusFrame as Record<string, unknown>) ?? {}
  const consensusFrame: ConsensusFrame = {
    statement: String(cf.statement ?? ''),
    confidence: clamp(cf.confidence),
  }

  const hiddenAssumptions: HiddenAssumption[] = (
    Array.isArray(obj.hiddenAssumptions) ? obj.hiddenAssumptions : []
  )
    .map((a: Record<string, unknown>) => ({
      assumption: String(a.assumption ?? ''),
      whyItMatters: String(a.whyItMatters ?? ''),
      confidence: clamp(a.confidence),
    }))
    .filter((a) => a.confidence >= 0.4)

  const reversalMechanisms: ReversalMechanism[] = (
    Array.isArray(obj.reversalMechanisms) ? obj.reversalMechanisms : []
  ).map((r: Record<string, unknown>) => ({
    mechanism: String(r.mechanism ?? ''),
    explanation: String(r.explanation ?? ''),
    strength: clamp(r.strength),
  }))

  const secondOrderEffects: SecondOrderEffect[] = (
    Array.isArray(obj.secondOrderEffects) ? obj.secondOrderEffects : []
  ).map((e: Record<string, unknown>) => ({
    effect: String(e.effect ?? ''),
    explanation: String(e.explanation ?? ''),
    timeframe: TIMEFRAMES.includes(e.timeframe as (typeof TIMEFRAMES)[number])
      ? (e.timeframe as SecondOrderEffect['timeframe'])
      : 'medium_term',
  }))

  const tensionPoints: TensionPoint[] = (
    Array.isArray(obj.tensionPoints) ? obj.tensionPoints : []
  ).map((t: Record<string, unknown>) => ({
    tension: String(t.tension ?? ''),
    whyItCreatesDistinction: String(t.whyItCreatesDistinction ?? ''),
    resistanceLikelihood: clamp(t.resistanceLikelihood),
  }))

  return {
    consensusFrame,
    hiddenAssumptions,
    reversalMechanisms,
    secondOrderEffects,
    tensionPoints,
    strongestAsymmetry: String(obj.strongestAsymmetry ?? ''),
    resistancePrediction: String(obj.resistancePrediction ?? ''),
    distinctionNote: String(obj.distinctionNote ?? ''),
  }
}

export function parseContrarianRewrite(raw: string): {
  rewrittenContent: string
  distinctionNote: string
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new ContrarianParseError('Failed to parse rewrite JSON', raw)
  }

  return {
    rewrittenContent: String(obj.rewrittenContent ?? ''),
    distinctionNote: String(obj.distinctionNote ?? ''),
  }
}
