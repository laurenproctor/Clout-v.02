// lib/visual/prompt/index.ts
// Public entry point for the prompt compilation layer.
//
// CRITICAL: This layer translates VisualIntent → provider-specific prompt strings.
// Do NOT allow business logic or provider-specific heuristics to leak across this boundary.
// VisualIntent is the communication abstraction.
// Everything in lib/visual/prompt/ is the provider translation layer.

import type { VisualIntent, VisualPlatform, AspectRatio } from '../types/visual'
import type { TemplateSpec } from '../types/template'
import type { VisualGrammar } from '../types/grammar'
import { translateAttentionStrategy, translateCreativeRisk } from './socialTranslation'
import { getPlatformHint } from './platformHints'
import { getQualityDirectives, COMPOSITION_SUFFIX } from './qualityDirectives'
import { formatPromptForProvider } from './providerTranslation'
import { buildCompositionZoneDirective } from './compositionZone'
import { buildGrammarDirectives } from '../grammar/imageLanguage'

export function buildImagePrompt(params: {
  intent: VisualIntent
  platform?: VisualPlatform
  aspectRatio: AspectRatio
  styleOverride?: string
  provider?: 'openai'
  // Phase 2: hybrid-overlay additions
  templateSpec?: TemplateSpec
  grammar?: VisualGrammar
}): string {
  const { intent, platform, aspectRatio, styleOverride, provider = 'openai', templateSpec, grammar } = params

  const clauses: string[] = []

  // 1. Core visual concept — always first; sets what the image depicts
  clauses.push(intent.visualConcept)

  // 2. Attention mechanism translated to compositional language
  clauses.push(translateAttentionStrategy(intent.attentionStrategy))

  // 3. Creative risk — injects novelty or restraint
  clauses.push(translateCreativeRisk(intent.creativeRisk))

  // 4. Viewer emotion as a modifier phrase
  clauses.push(`evoking ${intent.viewerEmotion}`)

  // 5. Aesthetic layer
  clauses.push(`${intent.compositionStyle} composition`)
  clauses.push(`${intent.lightingStyle} lighting`)
  clauses.push(`${intent.colorMood} color palette`)

  // 6. Platform hint
  if (platform) {
    clauses.push(getPlatformHint(platform))
  }

  // 7. Aspect ratio framing hint (helps model understand intended use)
  if (aspectRatio === 'landscape') clauses.push('wide horizontal format, cinematic framing')
  if (aspectRatio === 'portrait')  clauses.push('vertical format, portrait orientation')

  // 8. Style override (from brand imagery profile or user input)
  if (styleOverride) clauses.push(styleOverride)

  // 9. Phase 2: Composition zone directive for hybrid-overlay templates
  //    Tells the AI where negative space must be so React can render typography there.
  if (templateSpec && intent.renderMode === 'hybrid-overlay') {
    clauses.push(buildCompositionZoneDirective(templateSpec))
  }

  // 10. Phase 2: Visual grammar directives — operational image-language constraints
  //     These constrain entropy, tonal range, texture, and visual exclusions.
  //     Exclusions matter as much as positive directives.
  if (grammar) {
    clauses.push(...buildGrammarDirectives(grammar))
  }

  // 11. Negative exclusions from VisualIntent
  if (intent.negativeSpace.length > 0) {
    clauses.push(`Avoid: ${intent.negativeSpace.join(', ')}`)
  }

  // 12. Quality directives + no-text rule
  //     For hybrid-overlay, we still want no text — the template renders all typography.
  clauses.push(getQualityDirectives(true))

  // 13. Composition standard — appended last so it reads as a finishing constraint
  clauses.push(COMPOSITION_SUFFIX)

  return formatPromptForProvider(clauses, provider)
}
