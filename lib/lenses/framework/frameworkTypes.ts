// Framework Lens — core type system
// All future lenses that produce structured outputs should mirror this pattern:
// Types → Prompt → Parser → Scoring → Assets → Pipeline

export type FrameworkType =
  | 'ladder'
  | 'spectrum'
  | 'flywheel'
  | 'pyramid'
  | 'matrix'
  | 'loop'
  | 'stack'
  | 'progression'
  | 'system'
  | 'operating_model'
  | 'lifecycle'
  | 'hierarchy'
  | 'ecosystem'

export interface FrameworkNode {
  id: string
  title: string
  description?: string
  order: number
}

export interface DiagramSpec {
  diagramType: FrameworkType
  layout: 'vertical' | 'horizontal' | 'radial' | 'grid'
  // Top 3–5 node titles in render priority order (highest conceptual weight first)
  visualPriority: string[]
}

export interface SocialAssets {
  linkedInPost: string
  twitterThread: string[]
  carouselOutline: string[]
  quoteCard: string
  hook: string
  presentationTitle: string
  podcastTalkingPoint: string
}

export interface FrameworkScoreBreakdown {
  namingStrength: number           // 2–4 word noun phrase with intellectual tension
  clarity: number                  // ≤6 nodes, each ≤8 words
  memorability: number             // has a quotable one-liner
  transferability: number          // logic applies across industries
  conceptDensity: number           // compresses a lot of meaning into few words
  conceptualDistinctiveness: number // differs from stock frameworks
  explanatoryElegance: number      // explains phenomenon more cleanly than alternatives
  structuralFit: number            // framework type genuinely matches the idea's shape
  authorityPotential: number       // implies proprietary intellectual territory
  visualizability: number          // diagram spec has a clear renderable layout
}

export interface FrameworkCandidate {
  frameworkName: string
  frameworkType: FrameworkType
  coreTension: string
  coreInsight: string
  transferableInsight: string
  whyItMatters: string
  nodes: FrameworkNode[]
  visualDescription: string
  quote: string
  diagramSpec: DiagramSpec

  // Recurring conceptual domains — groundwork for authority and worldview extraction
  intellectualTerritory?: string[]  // e.g. ['AI infrastructure', 'distribution systems']

  // Lens composition — which lenses shaped this candidate
  appliedLenses?: string[]          // e.g. ['framework', 'authority']
  composable: true                  // all framework candidates participate in lens composition

  // Scoring — filled by frameworkScoring.ts after parsing
  score: number
  scoreBreakdown: FrameworkScoreBreakdown
}

export interface RankingMetadata {
  scoringWeights: Record<keyof FrameworkScoreBreakdown, number>
  rankingVersion: string
  candidateCount: number
}

export interface GenerationMetadata {
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
  generatedAt: string
}

export interface FrameworkOutput {
  top: FrameworkCandidate
  alternates: FrameworkCandidate[]     // remaining candidates sorted by score desc
  rawCandidates: FrameworkCandidate[]  // all pre-scoring, preserved for training/evaluation
  socialAssets: SocialAssets
  rankingMetadata: RankingMetadata
  generationMetadata: GenerationMetadata
}

// Discriminator constant used in outputs.content_type
export const FRAMEWORK_CONTENT_TYPE = 'framework' as const

// Claude returns these raw (without scoring fields) — parser fills the rest
export type RawFrameworkCandidate = Omit<FrameworkCandidate, 'score' | 'scoreBreakdown' | 'composable'>
