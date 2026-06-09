// lib/visual/templates/registry.ts
// TemplateSpec registry — 5 templates.
// Template selection is deterministic and auditable. Taste policy lives here.

import type { TemplateSpec, TemplateId } from '../types/template'

const TEMPLATES: TemplateSpec[] = [
  {
    id:                 'editorial-hero',
    compositionZone:    'bottom-left',    // text lives bottom-left; subject upper-right
    textZone:           'bottom-left',
    supportsBackground: true,
    renderEngine:       'puppeteer',
    allowedLogoCorners: ['top-right', 'top-left'],
  },
  {
    id:                 'quote-monolith',
    compositionZone:    'center',         // centered typography; background is texture/solid
    textZone:           'center',
    supportsBackground: true,
    renderEngine:       'puppeteer',
    allowedLogoCorners: ['top-right'],
  },
  {
    id:                 'stat-monument',
    compositionZone:    'center',         // large numeral center/upper-center
    textZone:           'center',
    supportsBackground: true,
    renderEngine:       'satori',         // no Puppeteer template yet; Satori is fallback
    allowedLogoCorners: ['top-right'],
  },
  {
    id:                 'split-panel',
    compositionZone:    'right',          // text lives on right 42%; subject on left 58%
    textZone:           'right',
    supportsBackground: true,
    renderEngine:       'puppeteer',
    allowedLogoCorners: ['top-left', 'top-right'],
  },
  {
    id:                 'upper-left',
    compositionZone:    'upper-left',     // text upper-left; subject lower-right
    textZone:           'overlay',
    supportsBackground: true,
    renderEngine:       'puppeteer',
    allowedLogoCorners: ['bottom-right', 'top-right'],
  },
]

const REGISTRY = new Map<TemplateId, TemplateSpec>(
  TEMPLATES.map(t => [t.id, t])
)

export function getTemplateSpec(id: TemplateId): TemplateSpec {
  const spec = REGISTRY.get(id)
  if (!spec) throw new Error(`Unknown template: ${id}`)
  return spec
}

export function getAllTemplateSpecs(): TemplateSpec[] {
  return TEMPLATES
}
