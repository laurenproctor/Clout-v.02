import type { InstagramVisualFormat, InstagramVisualStyle, VisualTemplate } from './types'

export const VISUAL_TEMPLATES: VisualTemplate[] = [
  { id: 'editorial-carousel-v1', name: 'Editorial Carousel', category: 'carousel',   renderComponent: 'EditorialCarousel' },
  { id: 'minimal-carousel-v1',   name: 'Minimal Carousel',   category: 'carousel',   renderComponent: 'MinimalCarousel' },
  { id: 'bold-carousel-v1',      name: 'Bold Carousel',      category: 'carousel',   renderComponent: 'BoldCarousel' },
  { id: 'quote-monolith-v1',     name: 'Quote Monolith',     category: 'quote',      renderComponent: 'QuoteMonolith' },
  { id: 'framework-flow-v1',     name: 'Framework Flow',     category: 'framework',  renderComponent: 'FrameworkFlow' },
  { id: 'narrative-arc-v1',      name: 'Narrative Arc',      category: 'narrative',  renderComponent: 'NarrativeArc' },
  { id: 'data-grid-v1',          name: 'Data Grid',          category: 'statistic',  renderComponent: 'DataGrid' },
]

const FORMAT_CATEGORY_MAP: Record<Exclude<InstagramVisualFormat, 'let_clout_decide'>, VisualTemplate['category']> = {
  educational_carousel: 'carousel',
  quote_graphic: 'quote',
  framework: 'framework',
  narrative_story: 'narrative',
  data_insight: 'statistic',
}

const STYLE_TEMPLATE_MAP: Partial<Record<InstagramVisualStyle, Partial<Record<VisualTemplate['category'], string>>>> = {
  editorial: { carousel: 'editorial-carousel-v1' },
  bold:      { carousel: 'bold-carousel-v1' },
  minimal:   { carousel: 'minimal-carousel-v1' },
}

export function resolveTemplateId(
  format: Exclude<InstagramVisualFormat, 'let_clout_decide'>,
  style: InstagramVisualStyle
): string {
  const category = FORMAT_CATEGORY_MAP[format]

  // Non-carousel formats have one template each
  if (category !== 'carousel') {
    const template = VISUAL_TEMPLATES.find(t => t.category === category)
    return template?.id ?? 'editorial-carousel-v1'
  }

  // Carousel: try style-specific variant first, fall back to editorial
  const styleTemplates = STYLE_TEMPLATE_MAP[style]
  return styleTemplates?.carousel ?? 'editorial-carousel-v1'
}

export function resolveAspectRatio(format: Exclude<InstagramVisualFormat, 'let_clout_decide'>): string {
  if (format === 'quote_graphic') return '1:1'
  return '4:5'
}
