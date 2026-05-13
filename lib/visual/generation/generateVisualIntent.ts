// lib/visual/generation/generateVisualIntent.ts
// Calls Claude to produce a VisualIntent — a communication brief, not a prompt.
//
// Claude is instructed as a visual strategist and social communications expert.
// The output is a strategic document that lib/visual/prompt/ will later translate
// into provider-specific prompt language.

import { callClaude } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import type { VisualIntent, VisualPlatform, BrandSemanticProfile } from '../types/visual'

const SYSTEM_PROMPT = `You are a visual strategist for professional content creators.

Your role is to design the visual strategy for a single image that will accompany written content on social and digital platforms. You think in terms of:

- Attention architecture: which mechanism (curiosity, status, urgency, contrast, novelty, human-intimacy) will make this image stop the scroll?
- Emotional impact: what should the viewer feel in the first 2 seconds?
- Visual metaphor: how can an image argue the same thing the text argues, without illustrating it literally?
- Platform psychology: what does a viewer in this specific context need to see to engage?
- Composition as meaning: where the eye travels is a form of argument.
- Creative risk: should this be familiar and trustworthy, or unexpected and memorable?

You do NOT write image generation prompts. You write a structured visual brief that a separate system will translate into a prompt. Think strategically, not descriptively.`

export interface GenerateVisualIntentInput {
  content: string
  platform: VisualPlatform
  emotionalTone?: string
  keyIdea?: string
  brandProfile?: BrandSemanticProfile
}

export async function generateVisualIntent(
  input: GenerateVisualIntentInput
): Promise<{ intent: VisualIntent; inputTokens: number; outputTokens: number }> {
  const { content, platform, emotionalTone, keyIdea, brandProfile } = input

  const lines: string[] = []

  lines.push('## Content to visualize')
  lines.push(content.slice(0, 2000))
  lines.push('')

  lines.push('## Target platform')
  lines.push(platform)
  lines.push('')

  if (emotionalTone) {
    lines.push('## Desired emotional tone')
    lines.push(emotionalTone)
    lines.push('')
  }

  if (keyIdea) {
    lines.push('## Core idea to express visually')
    lines.push(keyIdea)
    lines.push('')
  }

  if (brandProfile) {
    const b = brandProfile
    const hasIdentity =
      b.brandArchetype ||
      b.canonicalTraits.length > 0 ||
      b.visualStyles.length > 0 ||
      b.imageryType ||
      b.compositionPreference ||
      b.moodTraits.length > 0 ||
      b.negativeRules.length > 0

    if (hasIdentity) {
      lines.push('## Brand identity (reflect throughout your strategic brief)')
      lines.push('')

      // Archetype — the coherent identity anchor
      lines.push(`Brand archetype: ${b.brandArchetype}`)
      lines.push('  — The coherent identity anchor. All decisions should feel consistent with it.')
      lines.push('')

      // Temporal character — affects pacing, lighting, render energy
      lines.push(`Temporal character: ${b.temporalCharacter}`)
      if (b.temporalCharacter === 'timeless') {
        lines.push('  — Classical weight, crafted permanence, no trend-forward styling.')
      } else if (b.temporalCharacter === 'futuristic') {
        lines.push('  — Forward-leaning, speculative energy in lighting and form.')
      } else {
        lines.push('  — Of-the-moment, culturally fluent, current compositional language.')
      }
      lines.push('')

      // Color — interpreted palette, not hex values
      lines.push(`Color character: ${b.colorProfile.paletteCharacter}`)
      lines.push(`  — Temperature: ${b.colorProfile.temperature}, contrast: ${b.colorProfile.contrast}, register: ${b.colorProfile.emotionalRegister}`)
      lines.push('  — Set colorMood to reflect this palette\'s feel and emotional quality.')
      lines.push('    Describe the visual feeling the palette produces, not the color values themselves.')
      lines.push('')

      // Density — three separated dimensions
      lines.push('Visual composition dimensions:')
      lines.push(`  — Information density: ${b.informationDensity}`)
      lines.push(`  — Negative space preference: ${b.negativeSpacePreference}`)
      lines.push(`  — Composition complexity: ${b.compositionComplexity}`)
      lines.push('  — Let these three dimensions inform visualDensity and compositionStyle together.')
      lines.push('')

      // Canonical traits — top 3 by confidence
      if (b.canonicalTraits.length > 0) {
        const topTraits = b.canonicalTraits.slice(0, 3).map(t => t.trait).join(', ')
        lines.push(`Communication tone: ${topTraits}`)
        lines.push('')
      }

      // Imagery direction
      if (b.visualStyles.length > 0)   lines.push(`Visual styles: ${b.visualStyles.join(', ')}`)
      if (b.imageryType)               lines.push(`Imagery type: ${b.imageryType}`)
      if (b.compositionPreference)     lines.push(`Composition preference: ${b.compositionPreference}`)
      if (b.moodTraits.length > 0)     lines.push(`Mood: ${b.moodTraits.join(', ')}`)
      if (b.overlayTextStyle)          lines.push(`Preferred overlay style: ${b.overlayTextStyle} — use to inform overlayRecommendation`)
      if (b.negativeRules.length > 0)  lines.push(`Avoid: ${b.negativeRules.join(', ')}`)
      lines.push('')
    }
  }

  lines.push('## Output format')
  lines.push(`Return ONLY a JSON object. No markdown wrapper, no explanation.

{
  "attentionStrategy": "curiosity | status | urgency | contrast | novelty | human-intimacy",
  "viewerEmotion": "string — what the viewer should feel, in 2–4 words",
  "authoritySignal": "string or null — how this signals credibility (null if not applicable)",
  "narrativeFrame": "string or null — the story or tension the image implies",
  "scrollPattern": "string or null — where the eye travels and why",
  "visualConcept": "string — a specific, concrete scene or visual element (NOT abstract)",
  "compositionStyle": "string — e.g. rule-of-thirds, centered subject, asymmetric tension",
  "colorMood": "string — e.g. desaturated blues and grays, warm amber tones",
  "lightingStyle": "string — e.g. soft diffused window light, high-contrast dramatic side-light",
  "visualDensity": "minimal | balanced | dense",
  "overlayRecommendation": "none | string describing text or data to overlay",
  "renderMode": "${brandProfile ? 'hybrid-overlay' : 'fully-generated'}",
  "creativeRisk": "safe | balanced | experimental",
  "platformRationale": "string — why this approach fits ${platform}",
  "negativeSpace": ["string", "..."]
}`)

  const res = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage:  lines.join('\n'),
    maxTokens:    700,
    temperature:  0.7,
  })

  const intent = parseJson<VisualIntent>(res.content)

  return {
    intent,
    inputTokens:  res.inputTokens,
    outputTokens: res.outputTokens,
  }
}
