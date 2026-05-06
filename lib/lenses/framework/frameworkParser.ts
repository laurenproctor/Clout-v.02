import type { FrameworkCandidate, FrameworkType, RawFrameworkCandidate } from './frameworkTypes'

const VALID_TYPES = new Set<FrameworkType>([
  'ladder', 'spectrum', 'flywheel', 'pyramid', 'matrix',
  'loop', 'stack', 'progression', 'system', 'operating_model',
  'lifecycle', 'hierarchy', 'ecosystem',
])

const VALID_LAYOUTS = new Set(['vertical', 'horizontal', 'radial', 'grid'])

export class FrameworkParseError extends Error {
  constructor(message: string, public readonly rawResponse: string) {
    super(message)
    this.name = 'FrameworkParseError'
  }
}

function coerceFrameworkType(value: unknown): FrameworkType {
  if (typeof value === 'string' && VALID_TYPES.has(value as FrameworkType)) {
    return value as FrameworkType
  }
  return 'system'
}

function coerceLayout(value: unknown): 'vertical' | 'horizontal' | 'radial' | 'grid' {
  if (typeof value === 'string' && VALID_LAYOUTS.has(value)) {
    return value as 'vertical' | 'horizontal' | 'radial' | 'grid'
  }
  return 'vertical'
}

function parseNode(raw: unknown, index: number): FrameworkCandidate['nodes'][number] {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    id: typeof n.id === 'string' ? n.id : String(index + 1),
    title: typeof n.title === 'string' ? n.title.slice(0, 80) : `Node ${index + 1}`,
    description: typeof n.description === 'string' ? n.description.slice(0, 200) : undefined,
    order: typeof n.order === 'number' ? n.order : index + 1,
  }
}

function parseCandidate(raw: unknown): RawFrameworkCandidate {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Candidate is not an object')
  }
  const c = raw as Record<string, unknown>

  const frameworkType = coerceFrameworkType(c.frameworkType)
  const rawNodes = Array.isArray(c.nodes) ? c.nodes : []
  const diagramRaw = (c.diagramSpec && typeof c.diagramSpec === 'object' ? c.diagramSpec : {}) as Record<string, unknown>

  return {
    frameworkName: typeof c.frameworkName === 'string' ? c.frameworkName.slice(0, 100) : 'Unnamed Framework',
    frameworkType,
    coreTension: typeof c.coreTension === 'string' ? c.coreTension : '',
    coreInsight: typeof c.coreInsight === 'string' ? c.coreInsight : '',
    transferableInsight: typeof c.transferableInsight === 'string' ? c.transferableInsight : '',
    whyItMatters: typeof c.whyItMatters === 'string' ? c.whyItMatters : '',
    nodes: rawNodes.slice(0, 10).map(parseNode),
    visualDescription: typeof c.visualDescription === 'string' ? c.visualDescription : '',
    quote: typeof c.quote === 'string' ? c.quote.slice(0, 300) : '',
    diagramSpec: {
      diagramType: coerceFrameworkType(diagramRaw.diagramType) || frameworkType,
      layout: coerceLayout(diagramRaw.layout),
      visualPriority: Array.isArray(diagramRaw.visualPriority)
        ? diagramRaw.visualPriority.filter((x): x is string => typeof x === 'string').slice(0, 7)
        : [],
    },
    intellectualTerritory: Array.isArray(c.intellectualTerritory)
      ? c.intellectualTerritory.filter((x): x is string => typeof x === 'string').slice(0, 6)
      : undefined,
    appliedLenses: Array.isArray(c.appliedLenses)
      ? c.appliedLenses.filter((x): x is string => typeof x === 'string')
      : ['framework'],
  }
}

// Strips markdown fences and extracts the first JSON array from Claude's response
function extractJsonArray(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` fences if present
  const fenceStripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  // Find the first [ ... ] span
  const start = fenceStripped.indexOf('[')
  const end = fenceStripped.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in response')
  }
  return fenceStripped.slice(start, end + 1)
}

export function parseFrameworkCandidates(rawResponse: string): RawFrameworkCandidate[] {
  let arrayJson: string
  try {
    arrayJson = extractJsonArray(rawResponse)
  } catch {
    throw new FrameworkParseError('Response contains no JSON array', rawResponse)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(arrayJson)
  } catch {
    throw new FrameworkParseError('JSON parse failed', rawResponse)
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new FrameworkParseError('Expected non-empty array of candidates', rawResponse)
  }

  return parsed.map((item, i) => {
    try {
      return parseCandidate(item)
    } catch (err) {
      throw new FrameworkParseError(
        `Candidate ${i} failed validation: ${err instanceof Error ? err.message : String(err)}`,
        rawResponse
      )
    }
  })
}
