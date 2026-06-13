import type { ManualFallbackReason, ManualFallbackResult, ManualFallbackAction } from '@/lib/publishing/types'

// Builds the first-class manual-fallback product state for Substack. This is never an
// error dead-end: every reason yields a friendly, useful "draft prepared / finish in
// Substack" surface. The bridge (publishSubstackOutput) and UI consume this shape.

const COPY_OPEN: ManualFallbackAction[] = ['copy_content', 'open_substack']
const COPY_OPEN_RECONNECT: ManualFallbackAction[] = ['copy_content', 'open_substack', 'reconnect']

export function buildSubstackFallback(reason: ManualFallbackReason): ManualFallbackResult {
  switch (reason) {
    case 'missing_connection':
      return {
        ok: false,
        status: 'manual_fallback_required',
        reason,
        fallback: {
          title: 'No Substack publication connected',
          message: 'Connect a Substack publication, or copy the content to publish it manually.',
          actions: ['copy_content'],
        },
      }
    case 'auth_failed':
      return {
        ok: false,
        status: 'manual_fallback_required',
        reason,
        fallback: {
          title: 'Substack needs reconnecting',
          message: 'Your Substack session has expired. Reconnect to publish, or copy the content to finish manually.',
          actions: COPY_OPEN_RECONNECT,
        },
      }
    case 'missing_provider_url':
    case 'unexpected_response_shape':
      return {
        ok: false,
        status: 'manual_fallback_required',
        reason,
        fallback: {
          title: 'Substack draft prepared',
          message: 'Substack returned an unexpected response, so this was not marked as published. Copy the content or open Substack to finish manually.',
          actions: COPY_OPEN,
        },
      }
    case 'capability_unverified':
    case 'direct_publish_disabled':
    default:
      return {
        ok: false,
        status: 'manual_fallback_required',
        reason,
        fallback: {
          title: 'Substack draft prepared',
          message: 'Direct publishing is not available yet. Copy the content or open Substack to finish manually.',
          actions: COPY_OPEN,
        },
      }
  }
}
