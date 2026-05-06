export type EvidenceType =
  | 'market_data'
  | 'research'
  | 'historical'
  | 'operational'
  | 'industry_report'
  | 'benchmark'
  | 'behavioral'
  | 'comparative'

// Controls WHERE and HOW evidence enters the rewrite — prevents mechanical stat injection
export type IntegrationRole =
  | 'hook'               // leads the claim — highest visibility
  | 'support'            // backs the argument mid-content
  | 'contrast'           // reveals a tension or counterpoint
  | 'credibility_anchor' // establishes authority before a bold claim
  | 'historical_context' // frames current state against a prior moment

export interface Evidence {
  claim: string
  supportingFact: string
  source: string
  sourceUrl?: string
  confidence: number           // 0–1; suppress below 0.6
  evidenceType: EvidenceType
  integrationRole: IntegrationRole
  freshnessScore: number       // 0–1; decays with age relative to domain velocity
  retrievedAt: string          // ISO timestamp of retrieval
  publishedAt?: string         // ISO date of original source
  // Computed post-rewrite only — cannot assess rhetorical contribution before integration context exists
  evidenceContribution?: number  // 0–1; assigned during post-rewrite evaluation
}

export interface EvidenceOpportunity {
  originalClaim: string
  reasonEvidenceWouldHelp: string
  recommendedEvidenceType: EvidenceType
  recommendedIntegrationRole: IntegrationRole
  priority: number             // 1 = highest; retrieval capped at top 4
}
