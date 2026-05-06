import { callClaude } from '@/lib/ai/generate'
import type { Evidence } from './evidenceTypes'

// Domain-appropriate max age in years before evidence is suppressed
const DOMAIN_AGE_THRESHOLDS: Record<string, number> = {
  market_data: 2,
  research: 3,
  historical: Infinity,
  operational: 3,
  industry_report: 2,
  benchmark: 2,
  behavioral: 3,
  comparative: 3,
}

function computeFreshnessScore(publishedAt: string | undefined, retrievedAt: string): number {
  if (!publishedAt) return 0.5 // unknown age — neutral
  const pub = new Date(publishedAt).getTime()
  const ret = new Date(retrievedAt).getTime()
  const ageYears = (ret - pub) / (1000 * 60 * 60 * 24 * 365)
  // Exponential decay: half-life = 2 years
  return Math.exp(-0.347 * ageYears) // ln(2)/2 ≈ 0.347
}

function isExpired(item: Partial<Evidence>): boolean {
  if (!item.publishedAt || !item.evidenceType) return false
  const threshold = DOMAIN_AGE_THRESHOLDS[item.evidenceType] ?? 3
  if (!isFinite(threshold)) return false
  const ageYears =
    (new Date(item.retrievedAt ?? '').getTime() - new Date(item.publishedAt).getTime()) /
    (1000 * 60 * 60 * 24 * 365)
  return ageYears > threshold
}

// Pass 1: deterministic filters
export function deterministicValidation(
  raw: Partial<Evidence>[]
): { evidence: Evidence[]; sourceDiversityScore: number } {
  const seen = new Set<string>()
  const valid: Evidence[] = []

  for (const item of raw) {
    // Must have minimum required fields
    if (!item.claim || !item.supportingFact || !item.source || !item.sourceUrl) continue
    // Deduplicate by source URL
    if (seen.has(item.sourceUrl)) continue
    seen.add(item.sourceUrl)
    // Reject expired evidence
    if (isExpired(item)) continue

    const retrievedAt = item.retrievedAt ?? new Date().toISOString()
    const freshnessScore = computeFreshnessScore(item.publishedAt, retrievedAt)

    // Default confidence from Tavily score or neutral
    const confidence = (item.confidence ?? 0.7)
    if (confidence < 0.6) continue

    valid.push({
      claim: item.claim,
      supportingFact: item.supportingFact,
      source: item.source,
      sourceUrl: item.sourceUrl,
      confidence,
      evidenceType: item.evidenceType!,
      integrationRole: item.integrationRole!,
      freshnessScore,
      retrievedAt,
      publishedAt: item.publishedAt,
    })
  }

  const uniqueDomains = new Set(
    valid.map((e) => {
      try { return new URL(e.sourceUrl!).hostname } catch { return e.source }
    })
  ).size
  const sourceDiversityScore = valid.length > 0 ? uniqueDomains / valid.length : 0

  return { evidence: valid, sourceDiversityScore }
}

// Pass 2: semantic validation via Haiku — does this evidence actually strengthen the claim?
export async function semanticValidation(
  evidence: Evidence[]
): Promise<{ evidence: Evidence[]; notes: string }> {
  if (evidence.length === 0) return { evidence: [], notes: '' }

  const items = evidence.map((e, i) => ({
    index: i,
    claim: e.claim,
    supportingFact: e.supportingFact,
    integrationRole: e.integrationRole,
  }))

  let parsed: Array<{ index: number; pass: boolean; reason?: string }> = []

  try {
    const result = await callClaude({
      systemPrompt:
        'You are a rigorous evidence quality evaluator. For each evidence item, determine whether the supporting fact genuinely strengthens the specific claim it is meant to support. Suppress evidence that: (1) is broader than the claim, (2) is contextually misaligned, (3) introduces superficial authority without substantive support. Return a JSON array of { index, pass, reason? } — reason only when suppressing.',
      userMessage: JSON.stringify(items),
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 800,
      temperature: 0.1,
    })

    const text = result.content.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    // Semantic validation failure is non-fatal — pass all deterministically validated evidence
    return { evidence, notes: 'Semantic validation skipped due to model error.' }
  }

  const suppressedReasons: string[] = []
  const surviving = evidence.filter((_, i) => {
    const verdict = parsed.find((p) => p.index === i)
    if (verdict && !verdict.pass) {
      suppressedReasons.push(`[${i}] ${verdict.reason ?? 'suppressed'}`)
      return false
    }
    return true
  })

  const notes = suppressedReasons.length > 0
    ? `Suppressed ${suppressedReasons.length} item(s): ${suppressedReasons.join('; ')}`
    : ''

  return { evidence: surviving, notes }
}
