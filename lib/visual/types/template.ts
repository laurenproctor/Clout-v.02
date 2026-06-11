// lib/visual/types/template.ts
// Template system types for Phase 2 hybrid-overlay rendering.
// AI generates background atmosphere. React renders identity.

export type TemplateId =
  | 'editorial-hero'
  | 'quote-monolith'
  | 'stat-monument'
  | 'split-panel'
  | 'upper-left'

export type LogoCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

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
// allowedLogoCorners: vision model picks the best from this set; first entry is the default
export interface TemplateSpec {
  id: TemplateId
  compositionZone: 'bottom-left' | 'center' | 'right' | 'upper-left'
  textZone: 'bottom-left' | 'center' | 'right' | 'overlay'
  supportsBackground: boolean        // false = solid color only (no AI background)
  renderEngine: 'satori' | 'puppeteer'
  allowedLogoCorners: LogoCorner[]   // ordered: first = template default
}

// ─── Template Props — discriminated union ────────────────────────────────────
// Each template has its own typed props. This prevents type erasure and
// makes extractTemplateProps() return type-safe output.

export interface EditorialHeroProps {
  templateId: 'editorial-hero'
  headline: string          // max 8 words
  subtext?: string          // max 20 words
  authorCredit?: string
  backgroundUrl?: string     // optional — undefined renders solid brand-surface background
  logoUrl?: string
  fontHeadingUrl?: string   // used by Puppeteer renderer for @font-face; ignored by Satori
  fontBodyUrl?: string      // used by Puppeteer renderer for @font-face; ignored by Satori
  overlayOpacity?: number
  textShadow?: 'none' | 'light' | 'medium' | 'strong'
}

export interface QuoteMonolithProps {
  templateId: 'quote-monolith'
  quote: string             // max 40 words
  attribution?: string
  backgroundUrl?: string    // optional — falls back to solid surface color
  logoUrl?: string
  fontHeadingUrl?: string   // used by Puppeteer renderer for @font-face; ignored by Satori
  fontBodyUrl?: string      // used by Puppeteer renderer for @font-face; ignored by Satori
  overlayOpacity?: number
}

export interface StatMonumentProps {
  templateId: 'stat-monument'
  statistic: string         // the number/figure: "87%"
  context: string           // what it means: "of B2B buyers research before contacting sales"
  label?: string            // optional label above stat: "NEW DATA"
  source?: string           // citation
  backgroundUrl?: string
}

export interface SplitPanelProps {
  templateId: 'split-panel'
  headline: string          // max 8 words
  subtext?: string
  backgroundUrl?: string
  logoUrl?: string
  fontHeadingUrl?: string
  fontBodyUrl?: string
  overlayOpacity?: number
  textShadow?: 'none' | 'light' | 'medium' | 'strong'
}

export interface UpperLeftProps {
  templateId: 'upper-left'
  headline: string          // max 8 words
  subtext?: string
  backgroundUrl?: string
  logoUrl?: string
  fontHeadingUrl?: string
  fontBodyUrl?: string
  overlayOpacity?: number
  textShadow?: 'none' | 'light' | 'medium' | 'strong'
}

export type TemplateProps =
  | EditorialHeroProps
  | QuoteMonolithProps
  | StatMonumentProps
  | SplitPanelProps
  | UpperLeftProps
