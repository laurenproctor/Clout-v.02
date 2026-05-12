// lib/visual/grammar/imageLanguage.ts
// Translates VisualGrammar into directive clauses for prompt compilation.
// This is the bridge between the grammar layer and the provider layer.

import type { VisualGrammar } from '../types/grammar'

const TONAL_DIRECTIVES: Record<VisualGrammar['tonalRange'], string> = {
  compressed:     'compressed tonal range, low contrast, muted gradients',
  cinematic:      'cinematic tonal balance, rich shadows, controlled highlights',
  'high-contrast': 'high contrast, deep blacks, bright highlights, graphic clarity',
  flat:           'flat even lighting, no dramatic shadows, soft diffused',
}

export function buildGrammarDirectives(grammar: VisualGrammar): string[] {
  const directives: string[] = []

  // Tonal range
  directives.push(TONAL_DIRECTIVES[grammar.tonalRange])

  // Entropy
  if (grammar.entropy === 'low') {
    directives.push('simple composition, minimal visual elements, low visual complexity')
  } else if (grammar.entropy === 'high') {
    directives.push('layered composition, rich detail, multiple visual planes')
  }

  // Texture
  if (grammar.textureLevel < 0.2) {
    directives.push('clean smooth surfaces, no grain or noise')
  } else if (grammar.textureLevel > 0.6) {
    directives.push('visible texture, subtle grain, tactile surface quality')
  }

  // Negative space
  if (grammar.negativeSpaceRatio > 0.5) {
    directives.push(`generous negative space, ${Math.round(grammar.negativeSpaceRatio * 100)}% of frame unoccupied`)
  }

  // Subject distance
  const distanceMap: Record<VisualGrammar['subjectDistance'], string> = {
    macro:        'macro close-up, extreme detail',
    mid:          'mid-distance framing, subject fills roughly half the frame',
    wide:         'wide framing, environmental context around subject',
    environmental: 'environmental wide shot, subject small in large setting',
  }
  directives.push(distanceMap[grammar.subjectDistance])

  // Preferred lighting
  if (grammar.lightingStyle.length > 0) {
    directives.push(grammar.lightingStyle[0])
  }

  // Preferred crop
  if (grammar.cropStyle.length > 0) {
    directives.push(grammar.cropStyle[0])
  }

  // Exclusions — the most important part
  if (grammar.visualExclusions.length > 0) {
    directives.push(`avoid: ${grammar.visualExclusions.join(', ')}`)
  }

  return directives
}
