// lib/visual/prompt/compositionZone.ts
// Maps template composition zones → DALL-E negative space directives.
// This is the bridge between the template system and background image generation.
// Without this, the AI fills the entire frame and leaves no room for typography.

import type { TemplateSpec } from '../types/template'

const DESIGN_DIRECTOR_PREFIX =
  'CRITICAL COMPOSITION REQUIREMENT: the primary subject must sit ONLY on the side opposite the text zone — it must never enter the text zone. ' +
  'Keep the entire text placement area as clean, unobstructed negative space (empty surface, shadow, or gradient falloff) with no objects, props, or high-detail texture. ' +
  'Use a strongly asymmetrical editorial layout; do not center the subject. ' +
  'Leave one clean frame corner as quiet space for a small logo.'

const ZONE_DIRECTIVES: Record<TemplateSpec['compositionZone'], string> = {
  'bottom-left':
    'the ENTIRE lower-left half of the frame must be empty negative space — dark surface, shadow, or smooth gradient falloff with absolutely nothing of visual interest there; ' +
    'place the main visual subject firmly in the upper-right or right portion only, never spilling past the centre line into the lower-left where the headline sits',

  'center':
    'abstract or environmental background, no dominant foreground subject, texture or tonal gradient suitable for centered text overlay, clean and uncluttered throughout',

  'right':
    'place the main visual subject firmly in the left or left-centre portion only; the ENTIRE right half of the frame must be empty negative space, clean and uncluttered for text, with nothing crossing the centre line',

  'upper-left':
    'the ENTIRE upper-left region must be empty negative space for text; place the main visual interest firmly in the lower-right or right portion only, never entering the upper-left',
}

export function buildCompositionZoneDirective(templateSpec: TemplateSpec): string {
  return `${DESIGN_DIRECTOR_PREFIX} ${ZONE_DIRECTIVES[templateSpec.compositionZone]}`
}
