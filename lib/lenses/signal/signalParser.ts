import type {
  WeakSignal,
  DirectionalShift,
  StructuralTransition,
  IncentiveChange,
  FutureImplication,
  SignalRisk,
  SignalSourceType,
  SignalMaturity,
} from './signalTypes'

export class SignalParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message)
    this.name = 'SignalParseError'
  }
}

const SOURCE_TYPES: SignalSourceType[] = [
  'behavioral', 'economic', 'cultural', 'technological', 'regulatory', 'organizational',
]

const MATURITIES: SignalMaturity[] = [
  'fragmented', 'emerging', 'consolidating', 'institutionalized',
]

const SHIFT_TIMEFRAMES = ['emerging', 'accelerating', 'mainstreaming', 'late_stage'] as const
const IMPLICATION_TIMEFRAMES = ['short_term', 'medium_term', 'long_term'] as const

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new SignalParseError('No JSON object found', raw)
  return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
}

function clamp(v: unknown, fallback = 0.5): number {
  return Math.max(0, Math.min(1, typeof v === 'number' ? v : fallback))
}

export function parseSignalAnalysis(raw: string): {
  strongestSignal: string
  weakSignals: WeakSignal[]
  directionalShifts: DirectionalShift[]
  structuralTransitions: StructuralTransition[]
  incentiveChanges: IncentiveChange[]
  futureImplications: FutureImplication[]
  signalRisk: SignalRisk | undefined
  signalAsymmetry: string | undefined
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new SignalParseError('Failed to parse signal analysis JSON', raw)
  }

  const weakSignals: WeakSignal[] = (
    Array.isArray(obj.weakSignals) ? obj.weakSignals : []
  )
    .map((s: Record<string, unknown>) => ({
      signal: String(s.signal ?? ''),
      whyItMatters: String(s.whyItMatters ?? ''),
      confidence: clamp(s.confidence),
      momentum: clamp(s.momentum),
      sourceType: SOURCE_TYPES.includes(s.sourceType as SignalSourceType)
        ? (s.sourceType as SignalSourceType)
        : 'organizational' as SignalSourceType,
      maturity: MATURITIES.includes(s.maturity as SignalMaturity)
        ? (s.maturity as SignalMaturity)
        : 'emerging' as SignalMaturity,
    }))
    .filter((s) => s.confidence >= 0.4)

  const directionalShifts: DirectionalShift[] = (
    Array.isArray(obj.directionalShifts) ? obj.directionalShifts : []
  ).map((d: Record<string, unknown>) => ({
    shift: String(d.shift ?? ''),
    previousState: String(d.previousState ?? ''),
    emergingState: String(d.emergingState ?? ''),
    timeframe: SHIFT_TIMEFRAMES.includes(d.timeframe as (typeof SHIFT_TIMEFRAMES)[number])
      ? (d.timeframe as DirectionalShift['timeframe'])
      : 'emerging',
  }))

  const structuralTransitions: StructuralTransition[] = (
    Array.isArray(obj.structuralTransitions) ? obj.structuralTransitions : []
  ).map((t: Record<string, unknown>) => ({
    transition: String(t.transition ?? ''),
    driver: String(t.driver ?? ''),
    implication: String(t.implication ?? ''),
    severity: clamp(t.severity),
  }))

  const incentiveChanges: IncentiveChange[] = (
    Array.isArray(obj.incentiveChanges) ? obj.incentiveChanges : []
  ).map((c: Record<string, unknown>) => ({
    oldIncentive: String(c.oldIncentive ?? ''),
    newIncentive: String(c.newIncentive ?? ''),
    affectedGroups: Array.isArray(c.affectedGroups)
      ? c.affectedGroups.map(String)
      : [],
  }))

  const futureImplications: FutureImplication[] = (
    Array.isArray(obj.futureImplications) ? obj.futureImplications : []
  ).map((i: Record<string, unknown>) => ({
    implication: String(i.implication ?? ''),
    timeframe: IMPLICATION_TIMEFRAMES.includes(i.timeframe as (typeof IMPLICATION_TIMEFRAMES)[number])
      ? (i.timeframe as FutureImplication['timeframe'])
      : 'medium_term',
    likelihood: clamp(i.likelihood),
  }))

  // signalRisk: only include if falseSignalRisk > 0.5
  let signalRisk: SignalRisk | undefined
  if (obj.signalRisk && typeof obj.signalRisk === 'object') {
    const sr = obj.signalRisk as Record<string, unknown>
    const falseSignalRisk = clamp(sr.falseSignalRisk, 0)
    if (falseSignalRisk > 0.5) {
      signalRisk = {
        falseSignalRisk,
        reason: String(sr.reason ?? ''),
      }
    }
  }

  // signalAsymmetry: only include if non-empty string and not null
  const rawAsymmetry = obj.signalAsymmetry
  const signalAsymmetry =
    rawAsymmetry && typeof rawAsymmetry === 'string' && rawAsymmetry.length > 10
      ? rawAsymmetry
      : undefined

  return {
    strongestSignal: String(obj.strongestSignal ?? ''),
    weakSignals,
    directionalShifts,
    structuralTransitions,
    incentiveChanges,
    futureImplications,
    signalRisk,
    signalAsymmetry,
  }
}

export function parseSignalRewrite(raw: string): {
  rewrittenContent: string
  signalSummary: string
  strategicImplication: string
} {
  let obj: Record<string, unknown>
  try {
    obj = extractJson(raw)
  } catch {
    throw new SignalParseError('Failed to parse signal rewrite JSON', raw)
  }

  return {
    rewrittenContent: String(obj.rewrittenContent ?? ''),
    signalSummary: String(obj.signalSummary ?? ''),
    strategicImplication: String(obj.strategicImplication ?? ''),
  }
}
