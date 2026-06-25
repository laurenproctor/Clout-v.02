// lib/brand/types.ts
// Shared brand-application types. Kept here (not inline in the image pipeline) so brand
// diagnostics are an explicit, reusable contract rather than another implicit convention.

/** How a requested brand font was satisfied (or not) for a given text role. */
export type BrandFontSource =
  | 'custom_url'   // user-uploaded font URL used
  | 'google'       // Google Font URL resolved by name
  | 'generic'      // user chose a local/generic-safe family (Arial, Georgia, …) — passed as-is, no download
  | 'system'       // system-ui fallback used intentionally (explicitly requested)
  | 'unresolved'   // user requested a non-generic font but no URL resolved → system-ui fallback
  | 'none'         // no font requested/configured

export interface BrandFontDiagnostic {
  /** The font family the brand requested for this role (null if none). */
  requested: string | null
  source: BrandFontSource
  /** The downloadable .woff2 URL actually used, or null when none resolved. */
  resolvedUrl: string | null
  /** The family or resolved file was actually included in the render params. */
  passedToRenderer: boolean
  /** The renderer received only fallback/default typography (a real "font dropped" signal). */
  fallbackUsed: boolean
}

export interface BrandFontDiagnostics {
  heading: BrandFontDiagnostic
  body: BrandFontDiagnostic
}
