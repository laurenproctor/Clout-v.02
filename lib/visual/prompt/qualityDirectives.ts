// lib/visual/prompt/qualityDirectives.ts
// Quality and rendering suffixes appended to all prompts.
// Isolated so they can be tuned per provider without touching business logic.

export const QUALITY_SUFFIX = 'photorealistic, high resolution, professional quality, sharp focus, editorial photography standard'

export const NO_TEXT_SUFFIX = 'no text, no watermarks, no logos, no typography'

export const COMPOSITION_SUFFIX = 'clear visual hierarchy, intentional negative space, no cluttered foreground, magazine-quality composition'

export function getQualityDirectives(includeNoText: boolean): string {
  return includeNoText
    ? `${QUALITY_SUFFIX}. ${NO_TEXT_SUFFIX}`
    : QUALITY_SUFFIX
}
