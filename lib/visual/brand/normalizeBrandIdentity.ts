// lib/visual/brand/normalizeBrandIdentity.ts
//
// Pure normalization layer: converts raw DB brand rows into a BrandSemanticProfile.
//
// MUST remain: deterministic, synchronous, side-effect-free, and testable.
// No model calls, no DB access, no async, no mutation.
// Debugging visual consistency drift later depends on this being predictable.

import type { BrandSemanticProfile, CanonicalTrait } from '../types/visual'

// ── Color parsing & interpretation ────────────────────────────────────────

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return [r, g, b]
}

function perceivedLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function colorTemperature(r: number, g: number, b: number): 'warm' | 'cool' | 'neutral' {
  if (r > b + 30) return 'warm'
  if (b > r + 30) return 'cool'
  return 'neutral'
}

function colorSaturation(r: number, g: number, b: number): 'muted' | 'moderate' | 'vivid' {
  const spread = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
  if (spread < 0.15) return 'muted'
  if (spread < 0.40) return 'moderate'
  return 'vivid'
}

function describeColor(r: number, g: number, b: number): string {
  const lum  = perceivedLuminance(r, g, b)
  const temp = colorTemperature(r, g, b)
  const sat  = colorSaturation(r, g, b)

  if (lum < 0.15) {
    if (temp === 'cool') return 'deep navy / charcoal'
    if (temp === 'warm') return 'deep warm dark'
    return 'near-black'
  }
  if (lum < 0.35) {
    if (temp === 'cool') return 'dark cool'
    if (temp === 'warm') return 'dark warm'
    return 'dark neutral'
  }
  if (lum > 0.85) return 'bright open'
  if (lum > 0.65) {
    return temp === 'warm' ? 'light warm' : 'light neutral'
  }
  // Mid-range
  if (temp === 'warm' && sat !== 'muted') return 'warm gold / amber'
  if (temp === 'warm') return 'warm midtone'
  if (temp === 'cool' && sat !== 'muted') return 'saturated cool'
  if (temp === 'cool') return 'cool blue-gray'
  return 'neutral midtone'
}

interface ColorProfile {
  temperature:       'warm' | 'cool' | 'neutral'
  contrast:          'high' | 'moderate' | 'low'
  saturation:        'muted' | 'moderate' | 'vivid'
  emotionalRegister: string
  paletteCharacter:  string
}

function interpretColorPalette(
  primary:   string,
  secondary: string,
  accent:    string,
): ColorProfile {
  const p = parseHex(primary)   ?? [26,  26,  26]
  const s = parseHex(secondary) ?? [255, 255, 255]
  const a = parseHex(accent)    ?? [212, 165, 116]

  const pLum  = perceivedLuminance(...p)
  const sLum  = perceivedLuminance(...s)
  const pTemp = colorTemperature(...p)
  const pSat  = colorSaturation(...p)

  const contrastDelta = Math.abs(pLum - sLum)
  const contrast: 'high' | 'moderate' | 'low' =
    contrastDelta > 0.5 ? 'high' : contrastDelta > 0.25 ? 'moderate' : 'low'

  const primaryDesc = describeColor(...p)
  const accentDesc  = describeColor(...a)
  const accentQualifier = contrast === 'high' ? 'bold' : contrast === 'low' ? 'restrained' : ''

  const paletteCharacter = [
    `${primaryDesc} foundation`,
    `${accentQualifier} ${accentDesc} accent`.trim(),
    `${contrast} contrast`,
  ].join(', ')

  let emotionalRegister: string
  if (pLum < 0.25 && contrast === 'high')  emotionalRegister = 'high authority / editorial weight'
  else if (pTemp === 'warm' && pSat !== 'muted') emotionalRegister = 'warm consumer energy'
  else if (pTemp === 'cool' && pLum < 0.4) emotionalRegister = 'cool professional precision'
  else if (pLum > 0.7)                     emotionalRegister = 'clean open / approachable'
  else                                     emotionalRegister = 'professional modern'

  return { temperature: pTemp, contrast, saturation: pSat, emotionalRegister, paletteCharacter }
}

// ── Temporal character ────────────────────────────────────────────────────

const TIMELESS_SIGNALS   = new Set(['classic', 'timeless', 'heritage', 'traditional', 'enduring', 'legacy'])
const FUTURISTIC_SIGNALS = new Set(['futuristic', 'tech', 'forward', 'innovation', 'cutting-edge', 'advanced'])

function deriveTemporalCharacter(allTraits: string[]): 'timeless' | 'contemporary' | 'futuristic' {
  for (const t of allTraits) {
    const key = t.toLowerCase().trim()
    if (TIMELESS_SIGNALS.has(key))   return 'timeless'
    if (FUTURISTIC_SIGNALS.has(key)) return 'futuristic'
  }
  return 'contemporary'
}

// ── Trait canonicalization ────────────────────────────────────────────────

const SYNONYM_MAP: Record<string, string> = {
  luxury:          'editorial luxury',
  premium:         'editorial luxury',
  'high-end':      'editorial luxury',
  elevated:        'editorial luxury',
  exclusive:       'editorial luxury',
  professional:    'professional authority',
  corporate:       'professional authority',
  executive:       'professional authority',
  business:        'professional authority',
  authoritative:   'professional authority',
  institutional:   'professional authority',
  serious:         'professional authority',
  bold:            'bold',
  powerful:        'bold',
  strong:          'bold',
  impactful:       'bold',
  playful:         'playful',
  fun:             'playful',
  lighthearted:    'playful',
  calm:            'calm',
  serene:          'calm',
  peaceful:        'calm',
  quiet:           'calm',
  energetic:       'energetic',
  dynamic:         'energetic',
  vibrant:         'energetic',
  intellectual:    'intellectual',
  thoughtful:      'intellectual',
  analytical:      'intellectual',
  warm:            'warm',
  friendly:        'warm',
  human:           'warm',
  approachable:    'warm',
  conversational:  'warm',
  minimalist:      'minimal',
  minimal:         'minimal',
  edgy:            'edgy',
  inspirational:   'inspirational',
  inspiring:       'inspirational',
}

// Pairs that pull generation in opposing directions — higher confidence wins
const CONTRADICTIONS: [string, string][] = [
  ['playful',   'professional authority'],
  ['playful',   'editorial luxury'],
  ['energetic', 'calm'],
  ['energetic', 'editorial luxury'],
  ['bold',      'calm'],
  ['minimal',   'bold'],
]

function canonicalizeTraits(rawTraits: string[]): CanonicalTrait[] {
  const counts = new Map<string, number>()

  for (const raw of rawTraits) {
    const canonical = SYNONYM_MAP[raw.toLowerCase().trim()]
    if (canonical) counts.set(canonical, (counts.get(canonical) ?? 0) + 1)
  }

  const maxCount = Math.max(1, ...counts.values())
  let traits: CanonicalTrait[] = Array.from(counts.entries()).map(([trait, count]) => ({
    trait,
    // Floor at 0.55 so single signals still register; ceiling at 1.0 for multi-signal convergence
    confidence: 0.55 + (count / maxCount) * 0.45,
  }))

  // Resolve contradictions — drop the lower-confidence side
  for (const [a, b] of CONTRADICTIONS) {
    const aEntry = traits.find(t => t.trait === a)
    const bEntry = traits.find(t => t.trait === b)
    if (aEntry && bEntry) {
      traits = aEntry.confidence >= bEntry.confidence
        ? traits.filter(t => t.trait !== b)
        : traits.filter(t => t.trait !== a)
    }
  }

  return traits.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

// ── Brand archetype ───────────────────────────────────────────────────────

function deriveArchetype(traits: CanonicalTrait[]): string {
  const has = (...ts: string[]) => traits.some(t => ts.includes(t.trait))

  if (has('bold', 'intellectual') && has('editorial luxury')) return 'Editorial Luxury'
  if (has('editorial luxury') && has('calm'))                 return 'Quiet Luxury'
  if (has('editorial luxury'))                                return 'Editorial Luxury'
  if (has('professional authority') && !has('bold'))          return 'Institutional Authority'
  if (has('intellectual') && has('minimal'))                  return 'Technical Precision'
  if (has('edgy') && has('bold'))                             return 'Experimental Avant-Garde'
  if (has('playful') && has('energetic'))                     return 'Optimistic Consumer'
  if (has('warm'))                                            return 'Human-Centered'
  if (has('intellectual'))                                    return 'Technical Precision'
  if (has('professional authority'))                          return 'Institutional Authority'
  return 'Professional Modern'
}

// ── Visual density → separated dimensions ─────────────────────────────────

type DensityDimensions = {
  informationDensity:      'high' | 'moderate' | 'low'
  negativeSpacePreference: 'minimal' | 'balanced' | 'generous'
  compositionComplexity:   'layered' | 'structured' | 'clean'
}

function mapVisualDensity(density: string | null | undefined): DensityDimensions {
  if (density === 'compact')  return { informationDensity: 'high',     negativeSpacePreference: 'minimal',  compositionComplexity: 'layered' }
  if (density === 'spacious') return { informationDensity: 'low',      negativeSpacePreference: 'generous', compositionComplexity: 'clean' }
  return                             { informationDensity: 'moderate', negativeSpacePreference: 'balanced', compositionComplexity: 'structured' }
}

// ── Public entry point ────────────────────────────────────────────────────

export type ImageryRow = {
  visual_styles:      string[] | null
  imagery_type:       string | null
  composition:        string | null
  overlay_text_style: string | null
  mood_traits:        string[] | null
  negative_rules:     string[] | null
} | null

export type IdentityRow = {
  primary_color:   string | null
  secondary_color: string | null
  accent_color:    string | null
  tone_traits:     string[] | null
  style_traits:    unknown
} | null

export function normalizeBrandIdentity(
  imagery:  ImageryRow,
  identity: IdentityRow,
): BrandSemanticProfile {
  const toneTraits   = identity?.tone_traits  ?? []
  const moodTraits   = imagery?.mood_traits   ?? []
  const visualStyles = imagery?.visual_styles ?? []

  const allRawTraits = [...toneTraits, ...moodTraits, ...visualStyles]

  const canonicalTraits   = canonicalizeTraits(allRawTraits)
  const brandArchetype    = deriveArchetype(canonicalTraits)
  const temporalCharacter = deriveTemporalCharacter(allRawTraits)

  const styleTraits = (identity?.style_traits ?? {}) as Record<string, unknown>
  const density = typeof styleTraits['visual_density'] === 'string'
    ? styleTraits['visual_density']
    : null

  const colorProfile = interpretColorPalette(
    identity?.primary_color   ?? '#1A1A1A',
    identity?.secondary_color ?? '#FFFFFF',
    identity?.accent_color    ?? '#D4A574',
  )

  return {
    brandArchetype,
    temporalCharacter,
    colorProfile,
    ...mapVisualDensity(density),
    canonicalTraits,
    visualStyles,
    imageryType:          (() => {
      const raw = imagery?.imagery_type ?? null
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.length ? parsed.join(', ') : null
      } catch { /* not JSON */ }
      return raw
    })(),
    compositionPreference: imagery?.composition       ?? null,
    overlayTextStyle:     imagery?.overlay_text_style ?? null,
    moodTraits,
    negativeRules:        imagery?.negative_rules     ?? [],
  }
}
