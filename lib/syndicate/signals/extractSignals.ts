import { callClaude } from '@/lib/ai/generate'
import { buildSignalExtractionPrompt } from '../prompts/signalExtractionPrompt'
import type { ExtractedContent } from '../types/analysis'
import type { ContentSignal } from '../types/signals'

const CONFIDENCE_SUPPRESS_THRESHOLD = 0.4

function truncateForSignalExtraction(content: string): string {
  // Haiku context limit — keep signal extraction focused on the first ~12k chars
  // which contains the highest-density structural signals
  return content.length > 12_000 ? content.slice(0, 12_000) + '\n\n[content truncated]' : content
}

export async function extractSignals(extracted: ExtractedContent): Promise<ContentSignal[]> {
  const contentForAnalysis = truncateForSignalExtraction(extracted.content)
  const systemPrompt = buildSignalExtractionPrompt(extracted.content.length)

  const result = await callClaude({
    systemPrompt,
    userMessage: `Title: ${extracted.title}\nAuthor: ${extracted.author ?? 'unknown'}\n\n---\n\n${contentForAnalysis}`,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 4096,
  })

  let raw: unknown
  try {
    // Strip markdown fences if model wraps in ```json
    const cleaned = result.content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    raw = JSON.parse(cleaned)
  } catch {
    throw new Error(`Signal extraction returned invalid JSON: ${result.content.slice(0, 200)}`)
  }

  if (!Array.isArray(raw)) {
    throw new Error('Signal extraction did not return an array')
  }

  const signals: ContentSignal[] = raw
    .filter((item): item is ContentSignal => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.category === 'string' &&
        typeof item.observation === 'string' &&
        typeof item.interpretation === 'string' &&
        typeof item.confidence === 'number' &&
        item.confidence >= CONFIDENCE_SUPPRESS_THRESHOLD
      )
    })
    .map((item) => ({
      category: item.category,
      family: item.family,
      label: item.label ?? item.category,
      observation: item.observation,
      interpretation: item.interpretation,
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      strength: typeof item.strength === 'number' ? Math.min(1, Math.max(0, item.strength)) : 0.5,
      confidence: Math.min(1, Math.max(0, item.confidence)),
    }))

  return signals
}
