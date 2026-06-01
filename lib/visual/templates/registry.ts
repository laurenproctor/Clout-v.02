// lib/visual/templates/registry.ts
// TemplateSpec registry — 3 MVP templates.
// Template selection is deterministic and auditable. Taste policy lives here.
// Do not expand until usage data justifies new templates.

import type { TemplateSpec, TemplateId } from '../types/template'

const TEMPLATES: TemplateSpec[] = [
  {
    id:               'editorial-hero',
    compositionZone:  'bottom-left',    // text lives bottom-left; subject upper-right
    textZone:         'bottom-left',
    supportsBackground: true,
    renderEngine:     'puppeteer',
  },
  {
    id:               'quote-monolith',
    compositionZone:  'center',         // centered typography; background is texture/solid
    textZone:         'center',
    supportsBackground: true,
    renderEngine:     'puppeteer',
  },
  {
    id:               'stat-monument',
    compositionZone:  'center',         // large numeral center/upper-center
    textZone:         'center',
    supportsBackground: true,
    renderEngine:     'satori',         // no Puppeteer template yet; Satori is fallback
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
