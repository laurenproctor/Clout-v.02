// lib/visual/prompt/compositionZone.ts
// Maps template composition zones → DALL-E negative space directives.
// This is the bridge between the template system and background image generation.
// Without this, the AI fills the entire frame and leaves no room for typography.

import type { TemplateSpec } from '../types/template'

const ZONE_DIRECTIVES: Record<TemplateSpec['compositionZone'], string> = {
  'bottom-left':
    'heavy negative space in the lower-left third, dark shadow zone or gradient falloff lower-left, main visual subject positioned upper-right or center-right, clear open area lower-left for text overlay',

  'center':
    'abstract or environmental background, no dominant foreground subject, texture or tonal gradient suitable for centered text overlay, clean and uncluttered throughout',

  'right':
    'main visual subject positioned left-center, heavy negative space on the right half of the frame, clean uncluttered right side for text',

  'upper-left':
    'heavy negative space upper-left, main visual interest lower-right or center-right, open area upper-left for text placement',
}

export function buildCompositionZoneDirective(templateSpec: TemplateSpec): string {
  return ZONE_DIRECTIVES[templateSpec.compositionZone]
}
