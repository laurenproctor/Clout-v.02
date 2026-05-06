import type { Evidence, IntegrationRole } from './evidenceTypes'

const ROLE_ORDER: IntegrationRole[] = [
  'credibility_anchor',
  'hook',
  'support',
  'historical_context',
  'contrast',
]

const ROLE_INSTRUCTIONS: Record<IntegrationRole, string> = {
  credibility_anchor:
    'Place before bold or contrarian claims to establish credibility before the reader can resist.',
  hook:
    'Lead with this — it should create immediate forward momentum or reframe expectations.',
  support:
    'Integrate mid-argument to substantiate the claim without interrupting reasoning flow.',
  historical_context:
    'Use to frame current state against a prior moment; place where temporal contrast adds depth.',
  contrast:
    'Introduce a tension or counterpoint; most effective after the primary claim is established.',
}

export function formatEvidenceForRewrite(evidence: Evidence[]): string {
  if (evidence.length === 0) return 'No evidence retrieved.'

  const sorted = [...evidence].sort(
    (a, b) => ROLE_ORDER.indexOf(a.integrationRole) - ROLE_ORDER.indexOf(b.integrationRole)
  )

  return sorted
    .map((e, i) => {
      const lines = [
        `[Evidence ${i}]`,
        `Claim to support: ${e.claim}`,
        `Supporting fact: ${e.supportingFact}`,
        `Source: ${e.source}${e.sourceUrl ? ` (${e.sourceUrl})` : ''}`,
        `Integration role: ${e.integrationRole} — ${ROLE_INSTRUCTIONS[e.integrationRole]}`,
        `Confidence: ${e.confidence.toFixed(2)} | Freshness: ${e.freshnessScore.toFixed(2)}`,
      ]
      return lines.join('\n')
    })
    .join('\n\n')
}
