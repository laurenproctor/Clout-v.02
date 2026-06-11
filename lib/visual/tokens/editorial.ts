// lib/visual/tokens/editorial.ts
// Layout constants and adaptive sizing logic for the editorial-hero template.
// Both Satori (EditorialHero.tsx) and Puppeteer (EditorialHeroCard.tsx) import from here.
// Single source of truth — no values duplicated in spacing.ts.

import { SCALE, LEADING } from './scale'

export const EDITORIAL_HERO = {
  textZoneHeightRatio: 0.65,  // fraction of canvas height allocated to gradient + text zone
  paddingFloor:        72,    // minimum px from canvas edge to text block
  paddingRatio:        0.08,  // scales padding on larger canvases
  textWidthRatio:      0.42,  // max text block width as fraction of canvas width (when background image present)
  textWidthRatioSolid: 0.65,  // wider text zone for solid-color cards (no photo to protect)
  headlineMinScale:    0.65,  // never shrink headline below 65% of base size (~44px at 68px base)
  headlineTargetLines: 3,     // preferred max lines before font shrinks
  gap:                 16,    // px between headline and subtext elements
} as const

// Simulates CSS word-wrap to estimate how many lines `text` will occupy.
// More accurate than character-count division because words are placed as units.
export function estimateWrappedLines(text: string, fontSize: number, maxWidth: number): number {
  const avgCharWidth = fontSize * 0.52  // ~0.52em average per character (mixed-case Latin)
  const words = text.trim().split(/\s+/)
  let lines = 1
  let lineWidth = 0

  for (const word of words) {
    const wordWidth = word.length * avgCharWidth
    const needed = lineWidth > 0 ? avgCharWidth + wordWidth : wordWidth
    if (lineWidth > 0 && lineWidth + needed > maxWidth) {
      lines++
      lineWidth = wordWidth
    } else {
      lineWidth += needed
    }
  }

  return lines
}

// Returns the largest headline font size that fits both headline and subtext
// within `availableHeight`. Steps down by 2px until content fits or minimum is reached.
export function fitHeadlineSize(opts: {
  headline: string
  subtext?: string
  availableHeight: number
  availableWidth: number
  baseSize?: number
}): number {
  const { headline, subtext, availableHeight, availableWidth, baseSize = SCALE.headline } = opts
  const minSize = Math.round(baseSize * EDITORIAL_HERO.headlineMinScale)

  for (let size = baseSize; size >= minSize; size -= 2) {
    // Use the TRUE (unclamped) line count for height estimation.
    // headlineMaxLines is enforced at render time via -webkit-line-clamp.
    // Clamping here would underestimate height for very long headlines and
    // cause the loop to exit early, producing a false "fits" verdict.
    const headlineLines = estimateWrappedLines(headline, size, availableWidth)
    const headlineHeight = headlineLines * size * LEADING.headline

    let subtextHeight = 0
    if (subtext?.trim()) {
      const subtextLines = Math.min(estimateWrappedLines(subtext, SCALE.body, availableWidth), 2)
      subtextHeight = EDITORIAL_HERO.gap + subtextLines * SCALE.body * LEADING.body
    }

    if (headlineHeight + subtextHeight <= availableHeight) return size
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[editorial] fitHeadlineSize reached minimum', { headline: headline.slice(0, 60), minSize })
  }
  return minSize
}
