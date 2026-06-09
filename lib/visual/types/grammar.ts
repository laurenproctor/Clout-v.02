// lib/visual/types/grammar.ts
// VisualGrammar — operational image-language control.
// This layer constrains what the AI generates, not what the UI renders.
// Editorial systems are defined more by refusal than instruction.

export interface VisualGrammar {
  // Image complexity — how much visual activity is happening in the frame
  entropy: 'low' | 'medium' | 'high'

  // How densely the frame is filled (0 = empty, 1 = fully filled)
  compositionDensity: number    // 0.0–1.0

  // Proportion of frame that should remain unoccupied
  negativeSpaceRatio: number    // 0.0–1.0

  // How close the primary subject appears
  subjectDistance: 'macro' | 'mid' | 'wide' | 'environmental'

  // Tonal contrast treatment
  tonalRange: 'compressed' | 'cinematic' | 'high-contrast' | 'flat'

  // Surface texture presence (0 = smooth/clean, 1 = heavy grain/texture)
  textureLevel: number          // 0.0–1.0

  // Lighting descriptors (first item is preferred)
  lightingStyle: string[]

  // Crop/framing descriptors (first item is preferred)
  cropStyle: string[]

  // Explicit exclusions — what the AI must NOT produce
  // These matter as much as positive directives.
  visualExclusions: string[]
}

export interface ImageQualityScore {
  compositionClarity: number    // is the composition clean and readable? 0–1
  negativeSpaceQuality: number  // usable negative space in expected zone? 0–1
  tonalBalance: number          // does tonal range match the grammar? 0–1
  aestheticConfidence: number   // overall editorial quality 0–1
  overall: number               // weighted average (negativeSpaceQuality × 2)

  // Density-based layout selection (optional — present when Claude vision can determine)
  openZone?: 'bottom-left' | 'center' | 'right' | 'upper-left'
  openZoneConfidence?: number   // 0–1; 1 = unmistakably the best zone

  // Logo placement intelligence
  logoSafeZone?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  logoVisibilityScore?: number  // 0–1; estimated contrast/readability for a logo there
}

// Minimum quality score to proceed without regeneration.
// Below this threshold: regenerate with stricter directives (max 1 retry),
// then fall back to retrieved-editorial mode.
export const IMAGE_QUALITY_THRESHOLD = 0.65
