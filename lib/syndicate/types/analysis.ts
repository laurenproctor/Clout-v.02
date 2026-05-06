import type { ContentSignal, FailureMode } from './signals'

export interface ContentChunk {
  id: string
  text: string
  tokenCount: number
  section?: string
  order: number
}

export interface ExtractedContent {
  url: string
  title: string
  author?: string
  siteName?: string
  publishedAt?: string
  content: string
  excerpt?: string
  sections: { heading?: string; text: string }[]
  // Chunks for future retrieval, embedding, and cross-content comparison systems
  chunks: ContentChunk[]
  estimatedReadTime?: number
}

// First-class reasoning primitive — structural and compositional, harder to commoditize
// than psychological classification. Future: temporal dynamics (pacing decay, curiosity
// exhaustion, escalation curves as content progresses).
export interface NarrativeShape {
  structure: string             // e.g. "confession → competence → insight → authority restoration"
  escalation: string
  pacingNotes: string
  revealTiming: string
  tensionCurve: string
  vulnerabilitySequencing?: string
}

export interface CounterfactualAnalysis {
  loadBearingElements: string[]
  removalImpacts: string[]       // "removing X would cause Y" — specific, causal
  trustVsResistanceDrivers: string[]
  failureModes: FailureMode[]
  weaknesses: string[]
}

export interface StrategicRead {
  summary: string
  whyItWorks: string[]           // mechanism-specific, causal — no generic praise
  strategicTakeaways: string[]
}

export type AnalysisPhase =
  | 'extracting'
  | 'signal_analysis'
  | 'narrative_analysis'
  | 'strategic_synthesis'
  | 'counterfactual'
  | 'complete'

export const ANALYSIS_PHASE_LABELS: Record<AnalysisPhase, string> = {
  extracting: 'Extracting article…',
  signal_analysis: 'Identifying psychological signals…',
  narrative_analysis: 'Analyzing narrative structure…',
  strategic_synthesis: 'Building strategic analysis…',
  counterfactual: 'Running counterfactual reasoning…',
  complete: 'Analysis complete',
}

export interface SyndicateAnalysisResult {
  content: ExtractedContent
  signals: ContentSignal[]
  narrativeShape: NarrativeShape
  strategicRead: StrategicRead
  counterfactual: CounterfactualAnalysis
  meta: {
    analysisVersion: string
    signalVersion: string
    ontologyVersion: string
    promptVersion: string
    modelSignals: string
    modelSynthesis: string
    timingMs: Record<string, number>
    sessionId: string
  }
}
