import { searchTavily } from '@/lib/ai/research'
import type { Evidence, EvidenceOpportunity } from './evidenceTypes'

export async function retrieveEvidence(
  opportunities: EvidenceOpportunity[]
): Promise<{ evidence: Partial<Evidence>[]; anyFailed: boolean }> {
  // Cap at top 4 by priority
  const top = [...opportunities].sort((a, b) => a.priority - b.priority).slice(0, 4)

  const now = new Date().toISOString()

  const results = await Promise.allSettled(
    top.map(async (opp): Promise<Partial<Evidence>[]> => {
      const sources = await searchTavily(opp.originalClaim)
      return sources.map((s) => ({
        claim: opp.originalClaim,
        supportingFact: s.snippet ?? s.title,
        source: s.title,
        sourceUrl: s.url || undefined,
        evidenceType: opp.recommendedEvidenceType,
        integrationRole: opp.recommendedIntegrationRole,
        retrievedAt: now,
        // confidence and freshnessScore filled in validation pass
      }))
    })
  )

  const evidence: Partial<Evidence>[] = []
  let anyFailed = false

  for (const result of results) {
    if (result.status === 'fulfilled') {
      evidence.push(...result.value)
    } else {
      anyFailed = true
    }
  }

  return { evidence, anyFailed }
}
