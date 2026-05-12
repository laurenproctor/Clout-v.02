// lib/visual/types/template.ts
// Template system types for Phase 2 hybrid-overlay rendering.
// AI generates background atmosphere. React renders identity.

export type TemplateId =
  | 'editorial-hero'
  | 'quote-monolith'
  | 'stat-monument'

// Color roles — templates reference roles, never specific colors.
// Brand colors are mapped to these semantic roles by buildBrandTokens().
export interface BrandTokens {
  surface: string        // primary brand color (background)
  onSurface: string      // text color on surface (auto-computed for contrast)
  accent: string         // secondary brand color
  overlay: string        // gradient/panel overlay (surface at ~60% opacity)
  fontHeading: string    // font family for headlines
  fontBody: string       // font family for body/captions
  borderRadius: 'none' | 'subtle' | 'balanced'
}

// Each template has its own composition spec.
// compositionZone: where the background subject should be (text lives opposite)
// textZone: where React renders typography
export interface TemplateSpec {
  id: TemplateId
  compositionZone: 'bottom-left' | 'center' | 'right' | 'upper-left'
  textZone: 'bottom-left' | 'center' | 'right' | 'overlay'
  supportsBackground: boolean        // false = solid color only (no AI background)
  renderEngine: 'satori'             // playwright added in Phase 2.1
}

// ─── Template Props — discriminated union ────────────────────────────────────
// Each template has its own typed props. This prevents type erasure and
// makes extractTemplateProps() return type-safe output.

export interface EditorialHeroProps {
  templateId: 'editorial-hero'
  headline: string          // max 8 words
  subtext?: string          // max 20 words
  authorCredit?: string
  backgroundUrl: string
}

export interface QuoteMonolithProps {
  templateId: 'quote-monolith'
  quote: string             // max 40 words
  attribution?: string
  backgroundUrl?: string    // optional — falls back to solid surface color
}

export interface StatMonumentProps {
  templateId: 'stat-monument'
  statistic: string         // the number/figure: "87%"
  context: string           // what it means: "of B2B buyers research before contacting sales"
  label?: string            // optional label above stat: "NEW DATA"
  source?: string           // citation
  backgroundUrl?: string
}

export type TemplateProps =
  | EditorialHeroProps
  | QuoteMonolithProps
  | StatMonumentProps
