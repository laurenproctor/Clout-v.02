import { callClaude } from '@/lib/ai/generate'
import { buildStrategicReadPrompt } from '../prompts/strategicReadPrompt'
import type { ExtractedContent, NarrativeShape, StrategicRead } from '../types/analysis'
import type { ContentSignal } from '../types/signals'

export async function generateStrategicRead(
  extracted: ExtractedContent,
  signals: ContentSignal[],
  narrativeShape: NarrativeShape,
): Promise<StrategicRead> {
  const systemPrompt = buildStrategicReadPrompt()

  const signalSummary = signals
    .slice(0, 10)
    .map((s) => `- [${s.category}] ${s.label}: ${s.observation} → ${s.interpretation}`)
    .join('\n')

  const userMessage = `Title: ${extracted.title}
Author: ${extracted.author ?? 'unknown'}

## Identified signals
${signalSummary}

## Narrative structure
${narrativeShape.structure}
Escalation: ${narrativeShape.escalation}
Reveal timing: ${narrativeShape.revealTiming}

## Content excerpt (first 4000 chars)
${extracted.content.slice(0, 4_000)}`

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
    throw new Error(`Strategic read returned invalid JSON: ${result.content.slice(0, 200)}`)
  }

  const obj = raw as Record<string, unknown>

  return {
    summary: String(obj.summary ?? ''),
    whyItWorks: Array.isArray(obj.whyItWorks) ? obj.whyItWorks.map(String) : [],
    strategicTakeaways: Array.isArray(obj.strategicTakeaways) ? obj.strategicTakeaways.map(String) : [],
  }
}
