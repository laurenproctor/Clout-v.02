// lib/pinterest/messages.ts
// Maps readiness/publish error codes to actionable, user-facing copy. Covers every
// PinterestReadinessCode so Studio and toasts never surface a raw code.
import type { PinterestReadinessCode, PinterestWarningCode } from './readiness'

export const PINTEREST_ERROR_MESSAGES: Record<PinterestReadinessCode, string> = {
  pinterest_disabled:      'Pinterest publishing isn’t available yet.',
  missing_channel:         'Connect a Pinterest account before scheduling this Pin.',
  missing_credentials:     'Reconnect your Pinterest account to continue.',
  missing_board:           'Choose a Pinterest board before scheduling this Pin.',
  board_unavailable:       'This Pinterest board is no longer available. Choose another board.',
  missing_image:           'Pinterest Pins require an image. Attach a visual asset.',
  media_url_not_fetchable: 'Pinterest can’t access this image. Choose or regenerate the visual asset.',
  missing_destination_url: 'Pinterest Pins require a destination link.',
  invalid_destination_url: 'Enter a valid URL beginning with http:// or https://.',
  utm_render_failed:       'The destination link couldn’t be prepared with tracking parameters.',
  missing_title:           'Pinterest Pins require a title. Add a search-oriented Pin title.',
  missing_description:     'Pinterest Pins require a description. Add a search-led Pin description.',
}

export const PINTEREST_WARNING_MESSAGES: Record<PinterestWarningCode, string> = {
  generic_title:        'This Pin uses the generic post title. A search-oriented Pinterest title performs better.',
  generic_description:  'This Pin uses the generic post body. A search-led Pinterest description performs better.',
  missing_alt_text:     'Add alt text describing the image for accessibility and discovery.',
  missing_keywords:     'Add keywords to guide the Pin’s title, description, and future analytics.',
  missing_visual_text:  'Add short visual text for the Pin image overlay.',
  visual_text_too_long: 'Visual text is long for an image overlay — aim for a few words.',
}

export function pinterestErrorMessage(code: string): string {
  return PINTEREST_ERROR_MESSAGES[code as PinterestReadinessCode] ?? 'This Pin isn’t ready to publish yet.'
}

export function pinterestWarningMessage(code: string): string {
  return PINTEREST_WARNING_MESSAGES[code as PinterestWarningCode] ?? 'This Pin could be improved for Pinterest search.'
}
