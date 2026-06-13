// lib/pinterest/messages.ts
// Maps readiness/publish error codes to actionable, user-facing copy. Covers every
// PinterestReadinessCode so Studio and toasts never surface a raw code.
import type { PinterestReadinessCode } from './readiness'

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
}

export function pinterestErrorMessage(code: string): string {
  return PINTEREST_ERROR_MESSAGES[code as PinterestReadinessCode] ?? 'This Pin isn’t ready to publish yet.'
}
