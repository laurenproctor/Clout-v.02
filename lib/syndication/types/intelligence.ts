export type Platform = 'x' | 'linkedin' | 'substack' | 'blog' | 'threads'

export type SyndicationPhase =
  | 'extracting'
  | 'analyzing'
  | 'generating'
  | 'complete'

export interface SyndicationIntelligence {
  thesis: string
  tone: string
  audience: string
  persuasive_mechanics: string[]
  authority_style: string
  emotional_style: string
  spreadability_patterns: string[]
  narrative_style: string
  platform_risks: Partial<Record<Platform, string>>
  key_quotes: string[]
  adaptation_constraints: string[]
}

export interface SyndicationOutput {
  platform: Platform
  content: string
}

export interface SyndicationRequest {
  input: string
  platforms: Platform[]
  lenses: string[]  // preset lens names + workspace lens IDs
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  x: 'X',
  linkedin: 'LinkedIn',
  substack: 'Substack',
  blog: 'Blog',
  threads: 'Threads',
}

export const PLATFORM_DESCRIPTORS: Record<Platform, string> = {
  x: 'Short-form · conversational · quotable',
  linkedin: 'Professional · authority-driven',
  substack: 'Editorial · immersive · long-form',
  blog: 'Structured · evergreen · searchable',
  threads: 'Social · conversational · reply-native',
}
