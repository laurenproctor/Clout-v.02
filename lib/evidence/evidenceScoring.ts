import type { Evidence } from './evidenceTypes'

// Assigns evidenceContribution post-rewrite from Claude's self-scored contributions array
export function applyEvidenceContributions(
  evidence: Evidence[],
  contributions: Array<{ index: number; score: number }>
): Evidence[] {
  return evidence.map((e, i) => {
    const contrib = contributions.find((c) => c.index === i)
    return contrib ? { ...e, evidenceContribution: Math.max(0, Math.min(1, contrib.score)) } : e
  })
}
