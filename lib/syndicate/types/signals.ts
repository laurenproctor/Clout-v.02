export type SignalFamily =
  | 'authority'
  | 'identity'
  | 'status'
  | 'emotion'
  | 'tension'
  | 'narrative'
  | 'distribution'

export type SignalCategory =
  // authority family
  | 'earned_authority'
  | 'competence_display'
  | 'authority_softening'
  // identity family
  | 'tribal_boundary'
  | 'insider_language'
  | 'audience_mirroring'
  // status family
  | 'status_signaling'
  | 'aspirational_alignment'
  // emotion family
  | 'earned_vulnerability'
  | 'fear'
  // tension family
  | 'tension_escalation'
  | 'curiosity_gap'
  | 'contrarianism'
  // narrative / distribution
  | 'hook'
  | 'novelty'
  | 'distribution'

// Typed failure modes for explicit weakness classification
export type FailureMode =
  | 'abstraction_overload'
  | 'insufficient_specificity'
  | 'premature_thesis_reveal'
  | 'emotional_flatness'
  | 'unsupported_contrarianism'
  | 'weak_payoff'
  | 'low_tension'
  | 'audience_mismatch'
  | 'over_context_dependence'
  | 'status_imbalance'

export interface SignalEvidence {
  quote: string
  section?: string
  // Offsets reserved for future highlighting UI and evidence linking
  startOffset?: number
  endOffset?: number
}

export interface ContentSignal {
  category: SignalCategory
  family: SignalFamily
  label: string
  // Observation = what structurally occurs in the text (factual)
  observation: string
  // Interpretation = why it matters causally ("X because Y")
  interpretation: string
  evidence: SignalEvidence[]
  strength: number    // 0–1
  confidence: number  // 0–1, calibrated per prompt rules
  // Phase 2 placeholder: signal interaction graph (reinforcement/contradiction between signals)
}

export const SIGNAL_FAMILY_LABELS: Record<SignalFamily, string> = {
  authority: 'Authority',
  identity: 'Identity',
  status: 'Status',
  emotion: 'Emotion',
  tension: 'Tension',
  narrative: 'Narrative',
  distribution: 'Distribution',
}
