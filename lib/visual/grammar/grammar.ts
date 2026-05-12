// lib/visual/grammar/grammar.ts
// VisualGrammar interface re-exported here for convenience.
// Grammar defaults and utilities live alongside the type definition.

export type { VisualGrammar, ImageQualityScore } from '../types/grammar'
export { IMAGE_QUALITY_THRESHOLD } from '../types/grammar'

// Default grammar for unknown archetypes.
// Errs on the side of restraint — better safe editorial than chaotic.
export const DEFAULT_GRAMMAR = {
  entropy: 'low' as const,
  compositionDensity: 0.4,
  negativeSpaceRatio: 0.55,
  subjectDistance: 'wide' as const,
  tonalRange: 'cinematic' as const,
  textureLevel: 0.3,
  lightingStyle: ['soft directional', 'natural diffused'],
  cropStyle: ['asymmetric thirds', 'wide establishing'],
  visualExclusions: ['neon', 'HDR tone mapping', 'heavy vignette', 'stock photo composition'],
}
