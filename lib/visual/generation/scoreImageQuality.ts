// lib/visual/generation/scoreImageQuality.ts
// Scores a generated background image for use in hybrid-overlay composition.
// Uses Claude vision to evaluate whether the image has the composition qualities
// the template needs — specifically usable negative space in the correct zone.

import { callClaude } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import type { ImageQualityScore } from '../types/grammar'
import type { VisualGrammar } from '../types/grammar'
import type { TemplateSpec } from '../types/template'
import { IMAGE_QUALITY_THRESHOLD } from '../types/grammar'

const SYSTEM_PROMPT = `You score images for editorial publishing use. Return ONLY valid JSON.
Score each dimension 0.0–1.0. Be honest — a bad score triggers a better generation.`

function buildScoringPrompt(grammar: VisualGrammar, templateSpec: TemplateSpec): string {
  return [
    `Score this background image for a "${templateSpec.id}" template.`,
    `The text overlay will appear in the "${templateSpec.textZone}" zone.`,
    `Expected tonal range: ${grammar.tonalRange}.`,
    `Expected negative space ratio: ${Math.round(grammar.negativeSpaceRatio * 100)}%.`,
    ``,
    `Score each dimension 0.0–1.0:`,
    `- compositionClarity: Is the composition clean and readable at a glance?`,
    `- negativeSpaceQuality: Is there clean usable negative space in the ${templateSpec.textZone} zone?`,
    `- tonalBalance: Does the tonal range match "${grammar.tonalRange}"?`,
    `- aestheticConfidence: Overall editorial quality — does this look premium?`,
    ``,
    `Also compute: overall = (compositionClarity + negativeSpaceQuality * 2 + tonalBalance + aestheticConfidence) / 5`,
    ``,
    `Return JSON: { compositionClarity, negativeSpaceQuality, tonalBalance, aestheticConfidence, overall }`,
  ].join('\n')
}

export async function scoreImageQuality(
  imageUrl: string,
  grammar: VisualGrammar,
  templateSpec: TemplateSpec
): Promise<ImageQualityScore> {
  try {
    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage:  `[Image URL: ${imageUrl}]\n\n${buildScoringPrompt(grammar, templateSpec)}`,
      maxTokens: 200,
    })

    const parsed = parseJson<Partial<ImageQualityScore>>(result.content)
    if (!parsed || typeof parsed.overall !== 'number') {
      // If scoring fails, return a passing score to avoid blocking generation
      console.warn('[visual/scoreImageQuality] Scoring returned unexpected format — defaulting to pass')
      return {
        compositionClarity: 0.7,
        negativeSpaceQuality: 0.7,
        tonalBalance: 0.7,
        aestheticConfidence: 0.7,
        overall: 0.7,
      }
    }

    return parsed as ImageQualityScore
  } catch (err) {
    // Scoring failure should not block generation — degrade gracefully
    console.warn('[visual/scoreImageQuality] Scoring failed — defaulting to pass:', err)
    return {
      compositionClarity: 0.7,
      negativeSpaceQuality: 0.7,
      tonalBalance: 0.7,
      aestheticConfidence: 0.7,
      overall: 0.7,
    }
  }
}

export { IMAGE_QUALITY_THRESHOLD }
