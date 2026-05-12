// lib/visual/grammar/archetypeGrammar.ts
// Hardcoded archetype → VisualGrammar mappings.
// These are policy decisions, not algorithmic outputs.
// Expand ONLY after usage data justifies a new archetype.

import type { VisualGrammar } from '../types/grammar'

export type BrandArchetype = 'Editorial' | 'Technical' | 'Human' | 'Bold'

export const ARCHETYPE_GRAMMAR: Record<BrandArchetype, VisualGrammar> = {
  Editorial: {
    entropy: 'low',
    compositionDensity: 0.4,
    negativeSpaceRatio: 0.55,
    subjectDistance: 'wide',
    tonalRange: 'cinematic',
    textureLevel: 0.3,
    lightingStyle: ['soft directional', 'window light', 'overcast natural'],
    cropStyle: ['wide establishing', 'asymmetric thirds', 'environmental portrait'],
    visualExclusions: [
      'neon', 'HDR tone mapping', 'heavy vignette', 'stock photo composition',
      'symmetrical center crop', 'hyper-detailed AI surrealism', 'overprocessed contrast',
    ],
  },

  Technical: {
    entropy: 'low',
    compositionDensity: 0.35,
    negativeSpaceRatio: 0.60,
    subjectDistance: 'wide',
    tonalRange: 'compressed',
    textureLevel: 0.1,
    lightingStyle: ['flat studio', 'cool diffused', 'monochrome gradient'],
    cropStyle: ['clean center', 'minimal detail', 'abstract structural'],
    visualExclusions: [
      'organic texture', 'warm tones', 'candid photography', 'noise or grain',
      'decorative elements', 'stock photo composition',
    ],
  },

  Human: {
    entropy: 'medium',
    compositionDensity: 0.55,
    negativeSpaceRatio: 0.35,
    subjectDistance: 'mid',
    tonalRange: 'cinematic',
    textureLevel: 0.4,
    lightingStyle: ['warm directional', 'golden hour', 'intimate indoor'],
    cropStyle: ['portrait close', 'mid-body frame', 'candid moment'],
    visualExclusions: [
      'empty landscapes', 'abstract geometry', 'cold blue tones',
      'stock photo composition', 'heavy grain',
    ],
  },

  Bold: {
    entropy: 'medium',
    compositionDensity: 0.5,
    negativeSpaceRatio: 0.45,
    subjectDistance: 'mid',
    tonalRange: 'high-contrast',
    textureLevel: 0.5,
    lightingStyle: ['dramatic side lighting', 'chiaroscuro', 'studio strobe'],
    cropStyle: ['strong diagonal', 'graphic crop', 'typographic focus'],
    visualExclusions: [
      'soft pastels', 'low contrast', 'busy backgrounds',
      'stock photo composition', 'overprocessed warmth',
    ],
  },
}

// Maps the BrandSemanticProfile.brandArchetype string → BrandArchetype enum.
// brandArchetype may include qualifiers like "Editorial Luxury" — resolve to nearest archetype.
export function resolveArchetype(brandArchetype: string): BrandArchetype {
  const lower = brandArchetype.toLowerCase()
  if (lower.includes('editorial') || lower.includes('luxury') || lower.includes('institutional')) return 'Editorial'
  if (lower.includes('technical') || lower.includes('precision') || lower.includes('data')) return 'Technical'
  if (lower.includes('human') || lower.includes('warm') || lower.includes('personal') || lower.includes('consumer')) return 'Human'
  if (lower.includes('bold') || lower.includes('optimistic') || lower.includes('energetic')) return 'Bold'
  return 'Editorial' // safe default
}
