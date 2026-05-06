import { callClaude } from '@/lib/ai/generate'
import { buildCounterfactualPrompt } from '../prompts/counterfactualPrompt'
import type { ExtractedContent, NarrativeShape, CounterfactualAnalysis } from '../types/analysis'
import type { ContentSignal, FailureMode } from '../types/signals'

const VALID_FAILURE_MODES = new Set<FailureMode>([
  'abstraction_overload',
  'insufficient_specificity',
  'premature_thesis_reveal',
  'emotional_flatness',
  'unsupported_contrarianism',
  'weak_payoff',
  'low_tension',
  'audience_mismatch',
  'over_context_dependence',
  'status_imbalance',
])

function parseFailureModes(raw: unknown): FailureMode[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((m): m is FailureMode => VALID_FAILURE_MODES.has(m as FailureMode))
}

export async function generateCounterfactual(
  extracted: ExtractedContent,
  signals: ContentSignal[],
  narrativeShape: NarrativeShape,
): Promise<CounterfactualAnalysis> {
  const systemPrompt = buildCounterfactualPrompt()

  const signalSummary = signals
    .slice(0, 8)
    .map((s) => `- [${s.category}] ${s.label}`)
    .join('\n')

  const userMessage = `Title: ${extracted.title}
Author: ${extracted.author ?? 'unknown'}

## Narrative structure
${narrativeShape.structure}
Tension curve: ${narrativeShape.tensionCurve}
Escalation: ${narrativeShape.escalation}

## Identified signals
${signalSummary}

## Content
${extracted.content.slice(0, 8_000)}`

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
    throw new Error(`Counterfactual returned invalid JSON: ${result.content.slice(0, 200)}`)
  }

  const obj = raw as Record<string, unknown>

  return {
    loadBearingElements: Array.isArray(obj.loadBearingElements) ? obj.loadBearingElements.map(String) : [],
    removalImpacts: Array.isArray(obj.removalImpacts) ? obj.removalImpacts.map(String) : [],
    trustVsResistanceDrivers: Array.isArray(obj.trustVsResistanceDrivers) ? obj.trustVsResistanceDrivers.map(String) : [],
    failureModes: parseFailureModes(obj.failureModes),
    weaknesses: Array.isArray(obj.weaknesses) ? obj.weaknesses.map(String) : [],
  }
}
