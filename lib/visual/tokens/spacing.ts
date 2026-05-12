// lib/visual/tokens/spacing.ts
// Spacing tokens for template layout. All values in pixels.

export const SPACING = {
  xs:  8,
  sm:  16,
  md:  24,
  lg:  40,
  xl:  64,
  xxl: 96,
} as const

// Padding applied to text zones within templates
export const TEXT_ZONE_PADDING = {
  'editorial-hero':   { x: 64, y: 64 },
  'quote-monolith':   { x: 64, y: 80 },
  'stat-monument':    { x: 80, y: 80 },
} as const
