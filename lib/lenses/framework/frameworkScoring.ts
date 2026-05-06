import type { FrameworkCandidate, FrameworkScoreBreakdown, RawFrameworkCandidate } from './frameworkTypes'

// Scoring weights — must sum to 1.0
// Bump RANKING_VERSION when weights change to preserve retrospective analysis
export const RANKING_VERSION = '1.0.0'

export const SCORING_WEIGHTS: Record<keyof FrameworkScoreBreakdown, number> = {
  namingStrength: 0.20,
  conceptDensity: 0.12,
  clarity: 0.10,
  memorability: 0.10,
  transferability: 0.10,
  conceptualDistinctiveness: 0.10,
  explanatoryElegance: 0.10,
  structuralFit: 0.10,
  authorityPotential: 0.08,
  visualizability: 0.10,
}

// Patterns that signal weak naming
const WEAK_NAME_PATTERNS = [
  /^the \w+ framework$/i,
  /^the \w+ model$/i,
  /^\d+ (tips|ways|steps|rules|keys)/i,
  /^how to/i,
  /^a better/i,
  /^the (importance|power|value) of/i,
]

const STRONG_NAME_PATTERNS = [
  /^the \w+ (trap|paradox|loop|stack|flywheel|curve|gap|ladder|spectrum|equation|debt|tax|dividend|gravity|ceiling|floor|effect|shift|lock|drain|cycle|engine|machine|spiral|war|race|game|trap|cliff|ceiling|wall|moat|wedge|lever)$/i,
]

const GENERIC_FRAMEWORKS = new Set([
  'the pyramid', 'the ladder', 'the funnel', 'the flywheel',
  'the matrix', 'the loop', 'the cycle', 'the system',
])

const FILLER_WORDS = ['authentic', 'powerful', 'resonant', 'valuable', 'impactful', 'engaging', 'meaningful']

function scoreNamingStrength(candidate: RawFrameworkCandidate): number {
  const name = candidate.frameworkName.toLowerCase().trim()
  const wordCount = name.split(/\s+/).length

  let score = 5 // base

  if (wordCount >= 2 && wordCount <= 4) score += 2
  if (wordCount === 1 || wordCount > 5) score -= 2

  if (STRONG_NAME_PATTERNS.some(p => p.test(name))) score += 3
  if (WEAK_NAME_PATTERNS.some(p => p.test(name))) score -= 3
  if (GENERIC_FRAMEWORKS.has(name)) score -= 2

  return Math.max(0, Math.min(10, score))
}

function scoreClarity(candidate: RawFrameworkCandidate): number {
  const nodeCount = candidate.nodes.length
  let score = 10

  if (nodeCount < 3) score -= 3
  if (nodeCount > 7) score -= 2
  if (nodeCount > 9) score -= 2

  const longNodes = candidate.nodes.filter(n => n.title.split(/\s+/).length > 8)
  score -= longNodes.length

  return Math.max(0, Math.min(10, score))
}

function scoreMemorability(candidate: RawFrameworkCandidate): number {
  const quote = candidate.quote.trim()
  const wordCount = quote.split(/\s+/).length
  let score = 5

  if (wordCount > 5 && wordCount <= 20) score += 3
  if (wordCount <= 5 || wordCount > 30) score -= 2

  const hasVerb = /\b(commoditize|capture|own|destroy|create|compound|accelerate|collapse|escape|build|earn|lose|win|shift|unlock|trap|fuel|drive|erode)\b/i.test(quote)
  if (hasVerb) score += 2

  if (FILLER_WORDS.some(w => quote.toLowerCase().includes(w))) score -= 2

  return Math.max(0, Math.min(10, score))
}

function scoreTransferability(candidate: RawFrameworkCandidate): number {
  const text = `${candidate.transferableInsight} ${candidate.coreInsight}`.toLowerCase()
  let score = 6

  // Domain-specific language that limits transferability
  const domainSpecific = ['software engineers', 'saas companies', 'b2b startups', 'e-commerce', 'healthcare']
  if (domainSpecific.some(d => text.includes(d))) score -= 2

  // Broad language that signals transferability
  const broadSignals = ['any', 'all', 'every', 'whenever', 'across industries', 'in any', 'regardless']
  if (broadSignals.some(s => text.includes(s))) score += 2

  if (candidate.intellectualTerritory && candidate.intellectualTerritory.length > 0) score += 1

  return Math.max(0, Math.min(10, score))
}

function scoreConceptDensity(candidate: RawFrameworkCandidate): number {
  const name = candidate.frameworkName
  const nameWordCount = name.split(/\s+/).length
  const insightWordCount = candidate.coreInsight.split(/\s+/).length
  let score = 5

  // Short name that carries a lot of meaning is high density
  if (nameWordCount <= 3 && insightWordCount > 20) score += 3
  if (nameWordCount > 5) score -= 2

  // Tension language signals compressed complexity
  const tensionWords = ['vs', 'versus', 'but', 'however', 'paradox', 'trap', 'despite', 'although', 'while', 'yet']
  if (tensionWords.some(w => candidate.coreTension.toLowerCase().includes(w))) score += 2

  return Math.max(0, Math.min(10, score))
}

function scoreConceptualDistinctiveness(candidate: RawFrameworkCandidate): number {
  const name = candidate.frameworkName.toLowerCase()
  let score = 6

  if (GENERIC_FRAMEWORKS.has(name)) score -= 3

  // Unusual framework type for common topics is a distinctiveness signal
  const unusualTypes = ['ecosystem', 'operating_model', 'spectrum', 'matrix']
  if (unusualTypes.includes(candidate.frameworkType)) score += 1

  // Strong tension language signals a non-obvious observation
  const tensionWords = ['trap', 'paradox', 'debt', 'tax', 'drain', 'ceiling', 'floor', 'cliff', 'war', 'race']
  if (tensionWords.some(w => name.includes(w))) score += 2

  return Math.max(0, Math.min(10, score))
}

function scoreExplanatoryElegance(candidate: RawFrameworkCandidate): number {
  const tension = candidate.coreTension.trim()
  const insight = candidate.coreInsight.trim()
  let score = 5

  if (tension.length > 20 && insight.length > 30) score += 2

  // Causal language = mechanistic explanation
  const causalWords = ['because', 'therefore', 'causes', 'leads to', 'results in', 'means that', 'which is why']
  if (causalWords.some(w => insight.toLowerCase().includes(w))) score += 2

  if (FILLER_WORDS.some(w => insight.toLowerCase().includes(w))) score -= 2

  return Math.max(0, Math.min(10, score))
}

function scoreStructuralFit(candidate: RawFrameworkCandidate): number {
  // Basic type/node-count consistency checks
  const type = candidate.frameworkType
  const nodeCount = candidate.nodes.length
  let score = 7

  if (type === 'matrix' && nodeCount !== 4) score -= 2
  if (type === 'pyramid' && (nodeCount < 3 || nodeCount > 5)) score -= 1
  if (type === 'spectrum' && nodeCount > 6) score -= 2
  if (type === 'flywheel' && (nodeCount < 3 || nodeCount > 6)) score -= 1

  // Check that diagram layout is plausible for type
  const { layout } = candidate.diagramSpec
  if (type === 'matrix' && layout !== 'grid') score -= 1
  if (type === 'spectrum' && layout !== 'horizontal') score -= 1
  if (['stack', 'pyramid', 'ladder', 'progression'].includes(type) && layout !== 'vertical') score -= 1

  return Math.max(0, Math.min(10, score))
}

function scoreAuthorityPotential(candidate: RawFrameworkCandidate): number {
  let score = 5

  if (candidate.intellectualTerritory && candidate.intellectualTerritory.length >= 2) score += 2
  if (candidate.whyItMatters.length > 60) score += 1

  const authoritySignals = ['proprietary', 'unique', 'distinct', 'original', 'reframe', 'reconsider', 'see differently']
  if (authoritySignals.some(w => candidate.whyItMatters.toLowerCase().includes(w))) score += 2

  return Math.max(0, Math.min(10, score))
}

function scoreVisualizability(candidate: RawFrameworkCandidate): number {
  const { diagramSpec } = candidate
  let score = 6

  if (diagramSpec.visualPriority.length >= 3) score += 2
  if (diagramSpec.layout && diagramSpec.diagramType) score += 1

  // Matrix on a stack topic, or spectrum on a hierarchy = poor fit
  const type = candidate.frameworkType
  const diagramType = diagramSpec.diagramType
  if (type !== diagramType) score -= 1

  return Math.max(0, Math.min(10, score))
}

export function scoreCandidate(candidate: RawFrameworkCandidate): FrameworkCandidate {
  const breakdown: FrameworkScoreBreakdown = {
    namingStrength: scoreNamingStrength(candidate),
    clarity: scoreClarity(candidate),
    memorability: scoreMemorability(candidate),
    transferability: scoreTransferability(candidate),
    conceptDensity: scoreConceptDensity(candidate),
    conceptualDistinctiveness: scoreConceptualDistinctiveness(candidate),
    explanatoryElegance: scoreExplanatoryElegance(candidate),
    structuralFit: scoreStructuralFit(candidate),
    authorityPotential: scoreAuthorityPotential(candidate),
    visualizability: scoreVisualizability(candidate),
  }

  const score = Math.round(
    Object.entries(breakdown).reduce((sum, [key, value]) => {
      return sum + value * SCORING_WEIGHTS[key as keyof FrameworkScoreBreakdown] * 10
    }, 0)
  )

  return {
    ...candidate,
    composable: true,
    score,
    scoreBreakdown: breakdown,
  }
}

export function rankCandidates(candidates: FrameworkCandidate[]): FrameworkCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score)
}
