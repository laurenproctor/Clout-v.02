// lib/blog/types.ts

export type QualitativeRating = 'strong' | 'moderate' | 'developing' | 'needs-work'

export interface QualitativeSignal {
  rating: QualitativeRating
  explanation: string
}

export interface NarrativeStrategy {
  coreArgument: string
  opposingView?: string
  tension: string
  stakes: string
  thesisStrength: 'safe' | 'moderate' | 'strong'
  audienceBeliefShift: string
  emotionalDrivers: string[]
  proofMechanisms: string[]
  contentAngle: string
}

export interface HeadlineOption {
  title: string
  style: 'contrarian' | 'data-led' | 'narrative' | 'question' | 'executive'
  strength: number
  why: string
}

export interface HookExploration {
  primaryAngle: string
  alternateAngles: string[]
  headlineOptions: HeadlineOption[]
  openingHooks: string[]
  recommendedHeadline: string
}

export interface ArticleMemory {
  canonicalClaims: string[]
  establishedClaims: string[]
  usedStatistics: string[]
  narrativeThreads: string[]
  unresolvedQuestions: string[]
  toneMarkers: string[]
  prohibitedRepetition: string[]
}

export interface OutlineSection {
  heading: string
  level: 'h2' | 'h3'
  purpose: string
  keyPoints: string[]
  estimatedWords: number
}

export interface ImageSpec {
  placement: 'hero' | 'inline'
  description: string
  style: string
  altText: string
  prompt: string
}

export interface ContentAnalysis {
  seo: {
    keywordDensity: number
    titleLength: number
    metaDescriptionLength: number
    headingStructure: string[]
    estimatedReadTime: number
  }
  editorial: {
    thesisClarity: QualitativeSignal
    argumentCoherence: QualitativeSignal
    topicalCompleteness: QualitativeSignal
    originalitySignal: QualitativeSignal
  }
  distribution: {
    linkedinReadiness: QualitativeSignal
    newsletterReadiness: QualitativeSignal
    shareability: QualitativeSignal
  }
}

export interface StrategicInsights {
  differentiationAngle: string
  audienceTension: string
  dominantLensInfluence: string
  expectedStrengths: string[]
  expectedWeaknesses: string[]
  alternativeAngles: string[]
}

export interface BlogGenerationRequest {
  sourceType: 'keyword' | 'url' | 'text'
  sourceContent?: string

  title?: string
  contentSummary?: string
  primaryKeyword: string
  secondaryKeywords: string[]
  additionalContext?: string

  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  goalType:
    | 'seo'
    | 'thought_leadership'
    | 'product_education'
    | 'comparison'
    | 'commentary'
    | 'evergreen_guide'
    | 'case_study'
    | 'news_reaction'

  brandVoice: 'technical' | 'executive' | 'editorial' | 'conversational' | 'luxury' | 'journalistic'
  tone: 'conservative' | 'balanced' | 'contrarian'

  opinionStrength: 'safe' | 'assertive' | 'provocative' | 'industry_challenging'

  audienceIdentity:
    | 'operator'
    | 'founder'
    | 'strategist'
    | 'engineer'
    | 'executive'
    | 'investor'
    | 'creator'
    | 'researcher'
    | 'mass_appeal'
    | 'custom'

  audienceCustom?: string

  narrativeTemperature:
    | 'analytical'
    | 'urgent'
    | 'optimistic'
    | 'skeptical'
    | 'confrontational'
    | 'reflective'
    | 'visionary'

  lensIds: string[]

  length: 'short' | 'standard' | 'long' | 'pillar'
  readingLevel: 'general' | 'professional' | 'technical' | 'executive'
  visualDensity: 'minimal' | 'balanced' | 'heavy'
  imageStyle: 'editorial' | 'ai_generated' | 'product' | 'minimalist' | 'technical' | 'luxury'

  toggles: {
    faqSection: boolean
    statistics: boolean
    pullQuotes: boolean
    tables: boolean
    ctaSection: boolean
    keyTakeaways: boolean
    tldr: boolean
    internalLinks: boolean
    externalCitations: boolean
  }
}

export interface BlogPipelinePhase {
  phase: string
  label: string
  startedAt: string
  completedAt?: string
  inputTokens?: number
  outputTokens?: number
}

export interface GeneratedBlogPackage {
  request: BlogGenerationRequest
  narrativeStrategy: NarrativeStrategy
  hookExploration: HookExploration
  selectedHeadline: string

  metadata: {
    metaTitle: string
    metaDescription: string
    slug: string
  }

  article: {
    title: string
    subtitle?: string
    outline: OutlineSection[]
    markdown: string
    wordCount: number
  }

  images: {
    hero?: ImageSpec
    inline: ImageSpec[]
  }

  distribution: {
    linkedin?: string
    xThread?: string
    newsletter?: string
  }

  contentAnalysis: ContentAnalysis
  strategicInsights: StrategicInsights

  generationMetadata: {
    model: string
    totalInputTokens: number
    totalOutputTokens: number
    totalDurationMs: number
    generatedAt: string
    phases: BlogPipelinePhase[]
  }
}
