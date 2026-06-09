// lib/visual/rendering/index.ts
// Unified renderTemplate() entry point.
// When ENABLE_PUPPETEER_RENDERING=true: React component → renderToStaticMarkup() → Puppeteer → PNG.
// Fallback: Satori path (existing, unchanged).

import 'server-only'
import { createElement, type ComponentType } from 'react'
import type { TemplateSpec, TemplateProps, BrandTokens } from '../types/template'
import { renderElementToPNG, type SatoriFont } from './satori'
import { defaultRenderer } from './puppeteer'
import { EditorialHero } from '@/components/visual/templates/EditorialHero'
import { QuoteMonolith } from '@/components/visual/templates/QuoteMonolith'
import { StatMonument } from '@/components/visual/templates/StatMonument'
import { EditorialHeroCard } from '@/components/visual/templates/puppeteer/EditorialHeroCard'
import { QuoteCard } from '@/components/visual/templates/puppeteer/QuoteCard'
import { SplitPanelCard } from '@/components/visual/templates/puppeteer/SplitPanelCard'
import { UpperLeftCard } from '@/components/visual/templates/puppeteer/UpperLeftCard'

export type { SatoriFont }

const PUPPETEER_ENABLED = process.env.ENABLE_PUPPETEER_RENDERING === 'true'

export async function renderTemplate(
  spec: TemplateSpec,
  props: TemplateProps,
  brand: BrandTokens,
  width: number,
  height: number,
  fonts: SatoriFont[]
): Promise<Buffer> {
  if (PUPPETEER_ENABLED && spec.renderEngine === 'puppeteer') {
    let component: ComponentType<any>
    switch (props.templateId) {
      case 'editorial-hero':
        component = EditorialHeroCard
        break
      case 'quote-monolith':
        component = QuoteCard
        break
      case 'split-panel':
        component = SplitPanelCard
        break
      case 'upper-left':
        component = UpperLeftCard
        break
      default:
        throw new Error(`No Puppeteer template for templateId: ${(props as TemplateProps).templateId}`)
    }
    const { renderToStaticMarkup } = await import('react-dom/server')
    const html = '<!DOCTYPE html>' + renderToStaticMarkup(
      createElement(component, { ...props, brand, width, height })
    )
    return defaultRenderer.render(html, width, height, props.templateId)
  }

  // ── Satori path — legacy fallback, retained for rollback safety ───────────
  let element: ReturnType<typeof createElement>

  switch (props.templateId) {
    case 'editorial-hero':
      element = createElement(EditorialHero, { ...props, brand, width, height })
      break
    case 'quote-monolith':
      element = createElement(QuoteMonolith, { ...props, brand, width, height })
      break
    case 'stat-monument':
      element = createElement(StatMonument, { ...props, brand, width, height })
      break
    case 'split-panel':
    case 'upper-left':
      // No Satori fallback — these templates are Puppeteer-only.
      // If Puppeteer is disabled, fall through to editorial-hero as a safe default.
      element = createElement(EditorialHero, {
        ...props,
        templateId: 'editorial-hero' as const,
        headline: (props as import('../types/template').SplitPanelProps).headline,
        backgroundUrl: (props as import('../types/template').SplitPanelProps).backgroundUrl,
        brand,
        width,
        height,
      })
      break
    default: {
      const _exhaustive: never = props
      throw new Error(`Unknown templateId: ${(_exhaustive as TemplateProps).templateId}`)
    }
  }

  return renderElementToPNG(element, width, height, fonts)
}
