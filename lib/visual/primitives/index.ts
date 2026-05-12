// lib/visual/primitives/index.ts
// Composable visual building blocks for hybrid-overlay and template-composed render modes.
// Phase 1: type stubs only. Full implementation in Phase 2.
//
// Primitives enable:
//   - Deterministic typography (AI-generated text is unreliable for branding)
//   - Composable layouts (carousels, quote cards, branded templates)
//   - Platform-safe overlay positioning

export type PrimitiveType =
  | 'headlineOverlay' // large text over image
  | 'quoteFrame'      // styled pullquote block
  | 'gradientPanel'   // color gradient layer for text legibility
  | 'logoLockup'      // workspace logo at a fixed position
  | 'statCallout'     // prominent number or metric
  | 'portraitCrop'    // person/face crop with defined framing
  | 'ctaStrip'        // call-to-action bar at bottom

export interface VisualPrimitive {
  type: PrimitiveType
  content?: string
  position?: 'top' | 'bottom' | 'center' | 'overlay'
}
