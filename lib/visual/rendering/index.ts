// lib/visual/rendering/index.ts
// Unified render() entry point — selects engine based on TemplateSpec.
// Phase 2: Satori only. Playwright added in Phase 2.1 for complex templates.

import { createElement } from 'react'
import type { TemplateSpec, TemplateProps, BrandTokens } from '../types/template'
import { renderElementToPNG, type SatoriFont } from './satori'
import { EditorialHero } from '@/components/visual/templates/EditorialHero'
import { QuoteMonolith } from '@/components/visual/templates/QuoteMonolith'
import { StatMonument } from '@/components/visual/templates/StatMonument'

export type { SatoriFont }

export async function renderTemplate(
  spec: TemplateSpec,
  props: TemplateProps,
  brand: BrandTokens,
  width: number,
  height: number,
  fonts: SatoriFont[]
): Promise<Buffer> {
  if (spec.renderEngine !== 'satori') {
    throw new Error(`Render engine '${spec.renderEngine}' not implemented yet`)
  }

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
    default: {
      const _exhaustive: never = props
      throw new Error(`Unknown templateId: ${(_exhaustive as TemplateProps).templateId}`)
    }
  }

  return renderElementToPNG(element, width, height, fonts)
}
