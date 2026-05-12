// lib/visual/prompt/socialTranslation.ts
// Translates VisualIntent's social science fields into language image models understand.
// AttentionStrategy and creativeRisk are Clout concepts — this module bridges them
// to visual/compositional terms that DALL-E and other providers respond to well.
//
// CRITICAL: This is provider translation, not business logic. The mappings here
// are about how models respond to language, not what the content means.

import type { AttentionStrategy } from '../types/visual'

const ATTENTION_PHRASES: Record<AttentionStrategy, string> = {
  'curiosity':       'unresolved visual tension, an implied off-frame presence, compositional imbalance that draws the eye',
  'status':          'authoritative framing, controlled environment, visual cues of expertise and accomplishment',
  'urgency':         'dynamic diagonal lines, high contrast, compressed negative space, kinetic energy',
  'contrast':        'strong juxtaposition of light and shadow, opposing visual elements in the same frame',
  'novelty':         'unexpected angle, surreal or abstract element, surprising subject matter for the context',
  'human-intimacy':  'direct eye contact or expressive human gesture, close-up framing, emotional accessibility',
}

const CREATIVE_RISK_PHRASES: Record<'safe' | 'balanced' | 'experimental', string> = {
  safe:         'clean, conventional composition, familiar visual language',
  balanced:     'considered composition with a single unexpected element',
  experimental: 'unconventional framing, asymmetric or deliberately imperfect composition, visually surprising',
}

export function translateAttentionStrategy(strategy: AttentionStrategy): string {
  return ATTENTION_PHRASES[strategy]
}

export function translateCreativeRisk(risk: 'safe' | 'balanced' | 'experimental'): string {
  return CREATIVE_RISK_PHRASES[risk]
}
