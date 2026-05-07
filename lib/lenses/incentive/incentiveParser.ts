import type {
  IncentiveActor,
  IncentiveConflict,
  IncentiveObservation,
  IncentiveType,
  IncentiveStrength,
  IncentiveAlignment,
} from './incentiveTypes'

export class IncentiveParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message)
    this.name = 'IncentiveParseError'
  }
}

const INCENTIVE_TYPES: IncentiveType[] = [
  'economic', 'status', 'institutional', 'political', 'career',
  'algorithmic', 'social', 'reputational', 'operational', 'legal',
]

const INCENTIVE_STRENGTHS: IncentiveStrength[] = ['weak', 'moderate', 'strong', 'dominant']

const INCENTIVE_ALIGNMENTS: IncentiveAlignment[] = [
  'aligned', 'partially_aligned', 'misaligned', 'conflicted',
]

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new IncentiveParseError('No JSON object found', raw)
  return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
}

function clamp(v: unknown, fallback = 0.5): number {
  return Math.max(0, Math.min(1, typeof v === 'number' ? v : fallback))
}

export function parseIncentiveAnalysis(raw: string): {
  primaryIncentive: string
  actors: IncentiveActor[]
  conflicts: IncentiveConflict[] | undefined
  observations: IncentiveObservation[]
  alignment: IncentiveAlignment
  hiddenTradeoff: string | undefined
  systemPressure: string | undefined
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new IncentiveParseError('Failed to parse incentive analysis JSON', raw)
  }

  const actors: IncentiveActor[] = (
    Array.isArray(obj.actors) ? obj.actors : []
  ).map((a: Record<string, unknown>) => ({
    actor: String(a.actor ?? ''),
    incentiveType: INCENTIVE_TYPES.includes(a.incentiveType as IncentiveType)
      ? (a.incentiveType as IncentiveType)
      : 'institutional' as IncentiveType,
    optimizationTarget: String(a.optimizationTarget ?? ''),
    pressureSource: String(a.pressureSource ?? ''),
    strength: INCENTIVE_STRENGTHS.includes(a.strength as IncentiveStrength)
      ? (a.strength as IncentiveStrength)
      : 'moderate' as IncentiveStrength,
  }))

  const rawConflicts = Array.isArray(obj.conflicts) ? obj.conflicts : []
  const conflicts: IncentiveConflict[] | undefined = rawConflicts.length > 0
    ? rawConflicts.map((c: Record<string, unknown>) => ({
        actorA: String(c.actorA ?? ''),
        actorB: String(c.actorB ?? ''),
        conflict: String(c.conflict ?? ''),
        consequence: String(c.consequence ?? ''),
      }))
    : undefined

  const observations: IncentiveObservation[] = (
    Array.isArray(obj.observations) ? obj.observations : []
  )
    .map((o: Record<string, unknown>) => ({
      actor: String(o.actor ?? ''),
      observedBehavior: String(o.observedBehavior ?? ''),
      likelyIncentive: String(o.likelyIncentive ?? ''),
      confidence: clamp(o.confidence),
    }))
    .filter((o) => o.confidence >= 0.4)

  const alignment: IncentiveAlignment = INCENTIVE_ALIGNMENTS.includes(obj.alignment as IncentiveAlignment)
    ? (obj.alignment as IncentiveAlignment)
    : 'partially_aligned'

  const rawTradeoff = obj.hiddenTradeoff
  const hiddenTradeoff =
    rawTradeoff && typeof rawTradeoff === 'string' && rawTradeoff.length > 10
      ? rawTradeoff
      : undefined

  const rawPressure = obj.systemPressure
  const systemPressure =
    rawPressure && typeof rawPressure === 'string' && rawPressure.length > 10
      ? rawPressure
      : undefined

  return {
    primaryIncentive: String(obj.primaryIncentive ?? ''),
    actors,
    conflicts,
    observations,
    alignment,
    hiddenTradeoff,
    systemPressure,
  }
}

export function parseIncentiveRewrite(raw: string): {
  rewrittenContent: string
  incentiveSummary: string
  strategicImplication: string
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new IncentiveParseError('Failed to parse incentive rewrite JSON', raw)
  }

  return {
    rewrittenContent: String(obj.rewrittenContent ?? ''),
    incentiveSummary: String(obj.incentiveSummary ?? ''),
    strategicImplication: String(obj.strategicImplication ?? ''),
  }
}
