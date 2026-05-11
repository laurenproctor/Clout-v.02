import type { Platform } from './intelligence'

export interface PlatformCapabilities {
  supportsThreads: boolean
  supportsMedia: boolean
  supportsCarousel: boolean
  supportsPolls: boolean
  supportsScheduling: boolean
  maxPostLength: number
  softPostLength?: number
  maxThreadLength?: number
}

// Low/medium/high behavioral signal keys
type SignalLevel = 'low' | 'medium' | 'high'

export interface PlatformBehaviorModel {
  // Core — every platform has these
  platform: Platform
  rhetoricalEnvironment: string
  structuralRules: string[]
  lengthTarget: string
  antiPatterns: string[]
  preWritingFramework?: string
  hashtagRule?: string

  // Behavioral signals — optional; Threads is the first to fully populate these.
  // Used to shape prompts and inform validation heuristics.
  // Not for building deterministic scoring pipelines.
  behaviorSignals?: {
    emotionalAuthenticityWeight: SignalLevel
    ctaResistance: SignalLevel
    authorityTolerance: SignalLevel
    polishPenalty: SignalLevel
    interruptionTolerance: SignalLevel
    ambiguityTolerance: SignalLevel
    explainabilityExpectation: SignalLevel
    listTolerance: SignalLevel
  }

  capabilities?: PlatformCapabilities
}
