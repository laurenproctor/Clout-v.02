// tests/visual/templates.test.ts
// HTML snapshot tests for Puppeteer template components.
// Runs with vitest, no browser required — verifies markup structure.
// Regressions here catch: missing elements, wrong CSS, broken font-face rules.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { QuoteCard } from '@/components/visual/templates/puppeteer/QuoteCard'
import { EditorialHeroCard } from '@/components/visual/templates/puppeteer/EditorialHeroCard'
import type { BrandTokens } from '@/lib/visual/types/template'

const MOCK_BRAND: BrandTokens = {
  surface:      '#1A1A1A',
  onSurface:    '#FFFFFF',
  accent:       '#D4A574',
  overlay:      'rgba(26, 26, 26, 0.6)',
  fontHeading:  'Georgia',
  fontBody:     'system-ui',
  borderRadius: 'balanced',
}

describe('QuoteCard', () => {
  it('renders an h3 element for the quote', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'The only way to do great work is to love what you do.',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toContain('<h3>')
    expect(html).toContain('The only way to do great work is to love what you do.')
  })

  it('renders attribution in a p element below the quote', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Stay hungry, stay foolish.',
        attribution: '— Steve Jobs',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    const h3Pos = html.indexOf('<h3>')
    const attrPos = html.indexOf('— Steve Jobs')
    expect(attrPos).toBeGreaterThan(h3Pos)
    expect(html).toContain('<p class="attribution">')
  })

  it('renders logo img when logoUrl is provided', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Test quote',
        logoUrl: 'https://example.com/logo.png',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toContain('https://example.com/logo.png')
    expect(html).toContain('class="logo"')
  })

  it('omits logo img when logoUrl is not provided', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Test quote',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).not.toContain('class="logo"')
  })

  it('includes @font-face rule when fontHeadingUrl is provided', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Font test',
        fontHeadingUrl: 'https://example.com/font.woff2',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toContain('@font-face')
    expect(html).toContain('https://example.com/font.woff2')
  })

  it('renders a complete HTML document structure', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Structure test',
        brand: MOCK_BRAND,
        width: 1080,
        height: 1080,
      })
    )
    expect(html).toContain('<html')
    expect(html).toContain('<head>')
    expect(html).toContain('<style')
    expect(html).toContain('<body>')
  })

  it('matches snapshot', () => {
    const html = renderToStaticMarkup(
      createElement(QuoteCard, {
        quote: 'Creativity is intelligence having fun.',
        attribution: '— Albert Einstein',
        backgroundUrl: 'https://example.com/bg.jpg',
        logoUrl: 'https://example.com/logo.png',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toMatchSnapshot()
  })
})

describe('EditorialHeroCard', () => {
  it('renders headline in an h2 element', () => {
    const html = renderToStaticMarkup(
      createElement(EditorialHeroCard, {
        headline: 'The Future of Content Marketing',
        backgroundUrl: 'https://example.com/bg.jpg',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toContain('<h2>')
    expect(html).toContain('The Future of Content Marketing')
  })

  it('renders subtext in a p.subtext element below headline', () => {
    const html = renderToStaticMarkup(
      createElement(EditorialHeroCard, {
        headline: 'The Future',
        subtext: 'How AI is reshaping brand storytelling',
        backgroundUrl: 'https://example.com/bg.jpg',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    const h2Pos = html.indexOf('<h2>')
    const subtextPos = html.indexOf('How AI is reshaping brand storytelling')
    expect(subtextPos).toBeGreaterThan(h2Pos)
    expect(html).toContain('class="subtext"')
  })

  it('renders logo img when logoUrl is provided', () => {
    const html = renderToStaticMarkup(
      createElement(EditorialHeroCard, {
        headline: 'Test headline',
        backgroundUrl: 'https://example.com/bg.jpg',
        logoUrl: 'https://example.com/logo.png',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toContain('https://example.com/logo.png')
    expect(html).toContain('class="logo"')
  })

  it('includes @font-face rules when font URLs are provided', () => {
    const html = renderToStaticMarkup(
      createElement(EditorialHeroCard, {
        headline: 'Font test',
        backgroundUrl: 'https://example.com/bg.jpg',
        fontHeadingUrl: 'https://example.com/heading.woff2',
        fontBodyUrl: 'https://example.com/body.woff2',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toContain('https://example.com/heading.woff2')
    expect(html).toContain('https://example.com/body.woff2')
  })

  it('matches snapshot', () => {
    const html = renderToStaticMarkup(
      createElement(EditorialHeroCard, {
        headline: 'The Future of Content Marketing',
        subtext: 'How AI is reshaping brand storytelling in 2025',
        backgroundUrl: 'https://example.com/bg.jpg',
        logoUrl: 'https://example.com/logo.png',
        brand: MOCK_BRAND,
        width: 1200,
        height: 675,
      })
    )
    expect(html).toMatchSnapshot()
  })
})
