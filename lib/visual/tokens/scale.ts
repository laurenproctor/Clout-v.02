// lib/visual/tokens/scale.ts
// Fixed typographic scale — templates reference these constants, never hardcode px.
// Satori renders these as absolute pixel values.

export const SCALE = {
  display:  120,  // StatMonument numerals only
  headline:  68,  // EditorialHero H1
  title:     48,  // QuoteMonolith quote text
  subhead:   24,  // Supporting context
  body:      18,  // Secondary text
  caption:   14,  // Attribution, author credits
  label:     12,  // Tracked caps, labels, sources
} as const

export const WEIGHT = {
  light:   300,
  regular: 400,
  medium:  500,
  bold:    700,
} as const

export const TRACKING = {
  tight:   '-0.03em',
  normal:  '0em',
  wide:    '0.06em',
  caps:    '0.10em',
} as const

export const LEADING = {
  display:  1.00,
  headline: 1.05,
  title:    1.15,
  body:     1.60,
} as const
