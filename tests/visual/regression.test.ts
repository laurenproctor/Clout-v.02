// tests/visual/regression.test.ts
// Visual regression tests — render templates to PNG and compare against baselines.
// Requires a browser. Opt-in: set RUN_VISUAL_REGRESSION=true to enable.
//
// First run: baselines are written to tests/visual/baselines/*.png and tests pass.
// Subsequent runs: rendered PNGs are compared pixel-by-pixel against baselines.
//   Fails if mismatched pixels exceed the threshold.
//
// Custom font regression: ensures brand fonts load correctly (not just system fonts).
// CSS regressions (font-size changes, layout shifts) show up in pixel diff before HTML snapshot.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import type { BrandTokens } from '@/lib/visual/types/template'
import { QuoteCard } from '@/components/visual/templates/puppeteer/QuoteCard'
import { EditorialHeroCard } from '@/components/visual/templates/puppeteer/EditorialHeroCard'
import { PuppeteerRenderer } from '@/lib/visual/rendering/puppeteer'

const SKIP = process.env.RUN_VISUAL_REGRESSION !== 'true'
const BASELINES_DIR = join(process.cwd(), 'tests/visual/baselines')
const PIXEL_THRESHOLD = 200 // max allowed mismatched pixels

const MOCK_BRAND: BrandTokens = {
  surface:      '#1A1A1A',
  onSurface:    '#FFFFFF',
  accent:       '#D4A574',
  overlay:      'rgba(26, 26, 26, 0.6)',
  fontHeading:  'Georgia',
  fontBody:     'system-ui',
  borderRadius: 'balanced',
}

function compareToBaseline(name: string, actualPng: Buffer): { mismatchedPixels: number } {
  mkdirSync(BASELINES_DIR, { recursive: true })
  const baselinePath = join(BASELINES_DIR, `${name}.png`)

  if (!existsSync(baselinePath)) {
    writeFileSync(baselinePath, actualPng)
    console.info(`[regression] baseline written: ${name}.png`)
    return { mismatchedPixels: 0 }
  }

  const baseline = PNG.sync.read(readFileSync(baselinePath))
  const actual   = PNG.sync.read(actualPng)

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `Dimension mismatch for "${name}": baseline ${baseline.width}x${baseline.height}, actual ${actual.width}x${actual.height}`
    )
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height })
  const mismatchedPixels = pixelmatch(
    baseline.data, actual.data, diff.data,
    baseline.width, baseline.height,
    { threshold: 0.1 }
  )

  if (mismatchedPixels > PIXEL_THRESHOLD) {
    const diffPath = join(BASELINES_DIR, `${name}.diff.png`)
    writeFileSync(diffPath, PNG.sync.write(diff))
    console.error(`[regression] diff written: ${name}.diff.png`)
  }

  return { mismatchedPixels }
}

describe('Visual regression tests', () => {
  let renderer: PuppeteerRenderer

  beforeAll(() => {
    if (SKIP) return
    renderer = new PuppeteerRenderer()
  })

  it.skipIf(SKIP)('QuoteCard renders correctly (set RUN_VISUAL_REGRESSION=true to run)', async () => {
    const html = '<!DOCTYPE html>' + renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Creativity is intelligence having fun.',
        attribution: '— Albert Einstein',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    const png = await renderer.render(html, 1200, 675, 'quote-monolith')
    const { mismatchedPixels } = compareToBaseline('quote-card', png)
    expect(mismatchedPixels).toBeLessThan(PIXEL_THRESHOLD)
  }, 60_000)

  it.skipIf(SKIP)('QuoteCard with custom brand font renders correctly', async () => {
    // Verifies custom @font-face fonts load before screenshot — critical for brand consistency
    const html = '<!DOCTYPE html>' + renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Custom font test: the quick brown fox.',
        attribution: '— Brand Voice',
        fontHeadingUrl: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQZNLo_U2r.woff2',
        brand: { ...MOCK_BRAND, fontHeading: 'Playfair Display' },
        width: 1200,
        height: 675,
      })
    )
    const png = await renderer.render(html, 1200, 675, 'quote-monolith-font')
    const { mismatchedPixels } = compareToBaseline('quote-card-custom-font', png)
    expect(mismatchedPixels).toBeLessThan(PIXEL_THRESHOLD)
  }, 60_000)

  it.skipIf(SKIP)('EditorialHeroCard renders correctly', async () => {
    const html = '<!DOCTYPE html>' + renderToStaticMarkup(
      createElement(EditorialHeroCard, {
        headline: 'The Future of Content Marketing',
        subtext: 'How AI is reshaping brand storytelling in 2025',
        backgroundUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    const png = await renderer.render(html, 1200, 675, 'editorial-hero')
    const { mismatchedPixels } = compareToBaseline('editorial-hero', png)
    expect(mismatchedPixels).toBeLessThan(PIXEL_THRESHOLD)
  }, 60_000)
})
