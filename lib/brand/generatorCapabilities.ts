// lib/brand/generatorCapabilities.ts
// Explicit, declarative record of how each generation surface relates to Brand Settings.
// Brand application used to be implicit — each generator silently decided whether brand
// mattered, so new generators could ship ignoring it (the original bug). This registry makes
// the relationship a reviewable contract: a generator's row states exactly which brand
// surfaces it consumes, and the test asserts the registry stays in sync with reality.
//
// When you add a generator, add a row here (the test fails until you do) and wire whatever the
// row claims. See docs/brand-application.md for the precedence model and the two brand surfaces.

export interface GeneratorBrandCapabilities {
  /** Stable identifier for the generator. */
  id: string
  /** Primary API route. */
  route: string
  /** Applies editorial voice — tone / generation notes / negative rules (via getBrandContext). */
  usesBrandVoice: boolean
  /** Applies brand identity — fonts / colors / style traits (visual render). */
  usesBrandIdentity: boolean
  /** Applies brand imagery guidelines — visual styles / mood / composition. */
  usesBrandImagery: boolean
  /** Can render user-uploaded custom font files (not just Google fonts by name). */
  supportsCustomFonts: boolean
  /** Records per-generation brand diagnostics on the produced artifact. */
  recordsBrandDiagnostics: boolean
}

const VOICE_ONLY = {
  usesBrandVoice: true,
  usesBrandIdentity: false,
  usesBrandImagery: false,
  supportsCustomFonts: false,
  recordsBrandDiagnostics: false,
} as const

export const GENERATOR_BRAND_CAPABILITIES: readonly GeneratorBrandCapabilities[] = [
  // Visual — the only surface that renders type/colors, so the only one with identity + diagnostics.
  {
    id: 'image',
    route: '/api/visual/generate',
    usesBrandVoice: false,
    usesBrandIdentity: true,
    usesBrandImagery: true,
    supportsCustomFonts: true,
    recordsBrandDiagnostics: true,
  },
  // Text generators — editorial voice via the shared prompt block.
  // Instagram additionally folds imagery guidelines (visual styles / mood / composition) into
  // its prompt to inform intelligence.visualNarrative.
  { id: 'instagram', route: '/api/instagram/generate', usesBrandVoice: true, usesBrandIdentity: false, usesBrandImagery: true, supportsCustomFonts: false, recordsBrandDiagnostics: false },
  { id: 'threads',   route: '/api/threads/generate',   ...VOICE_ONLY },
  { id: 'linkedin',  route: '/api/linkedin/generate',  ...VOICE_ONLY },
  { id: 'note',      route: '/api/note/generate',      ...VOICE_ONLY },
  { id: 'blog',      route: '/api/blog/generate',      ...VOICE_ONLY },
  { id: 'substack',  route: '/api/substack/generate',  ...VOICE_ONLY },
  { id: 'draft',     route: '/api/draft/generate',     ...VOICE_ONLY },
] as const

/** Look up a generator's declared brand capabilities by id. */
export function getGeneratorBrandCapabilities(id: string): GeneratorBrandCapabilities | undefined {
  return GENERATOR_BRAND_CAPABILITIES.find(c => c.id === id)
}
