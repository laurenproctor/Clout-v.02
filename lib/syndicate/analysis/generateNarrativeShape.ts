import { callClaude } from '@/lib/ai/generate'
import { buildNarrativeShapePrompt } from '../prompts/narrativeShapePrompt'
import type { ExtractedContent } from '../types/analysis'
import type { NarrativeShape } from '../types/analysis'

export async function generateNarrativeShape(extracted: ExtractedContent): Promise<NarrativeShape> {
  const systemPrompt = buildNarrativeShapePrompt()

  // Use full content for narrative analysis — structure only emerges from the whole piece
  const userMessage = `Title: ${extracted.title}\nAuthor: ${extracted.author ?? 'unknown'}\nEstimated read time: ${extracted.estimatedReadTime ?? '?'} minutes\n\n---\n\n${extracted.content.slice(0, 16_000)}`

  const result = await callClaude({
    systemPrompt,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: 2048,
  })

  let raw: unknown
  try {
    const cleaned = result.content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    raw = JSON.parse(cleaned)
  } catch {
    throw new Error(`Narrative shape returned invalid JSON: ${result.content.slice(0, 200)}`)
  }

  const obj = raw as Record<string, unknown>

  return {
    structure: String(obj.structure ?? ''),
    escalation: String(obj.escalation ?? ''),
    pacingNotes: String(obj.pacingNotes ?? ''),
    revealTiming: String(obj.revealTiming ?? ''),
    tensionCurve: String(obj.tensionCurve ?? ''),
    vulnerabilitySequencing: obj.vulnerabilitySequencing ? String(obj.vulnerabilitySequencing) : undefined,
  }
}
