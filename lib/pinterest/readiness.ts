// lib/pinterest/readiness.ts
// Authoritative, server-side publishability check for a Pinterest output. UI validation
// is advisory only — every state transition and the publish path itself run this.
//
//   lightweight: cheap, no network — feature flag, channel, board resolution (DB-only),
//                image selected, destination present + well-formed.
//   strict:      lightweight + credential refresh, board availability, public image HEAD,
//                final UTM-render. Used by Move-to-Ready / Schedule / Publish now /
//                Campaign launch / scheduled worker, and always immediately before createPin.
import { createServiceClient } from '@/lib/supabase/service'
import { FEATURES } from '@/lib/features'
import { resolveBoardForOutput } from './boards'
import { resolvePinterestImage } from './image'
import { resolvePinterestDestinationUrl, tagPinterestDestination } from './destination'
import { assertImageFetchable } from './media'
import { getValidPinterestToken } from './credential'
import { PinterestApiError } from './types'
import type { Output, OutputContent } from '@/types/domain'

export type PinterestReadinessCode =
  | 'pinterest_disabled' | 'missing_channel' | 'missing_credentials'
  | 'missing_board' | 'board_unavailable' | 'missing_image'
  | 'media_url_not_fetchable' | 'missing_destination_url'
  | 'invalid_destination_url' | 'utm_render_failed'

export interface PinterestReadinessResult {
  ok: boolean
  errors: Array<{ code: PinterestReadinessCode; message: string }>
}

type Mode = 'lightweight' | 'strict'

function codeFrom(err: unknown, fallback: PinterestReadinessCode): PinterestReadinessCode {
  const code = (err as { code?: string }).code
  return (code as PinterestReadinessCode) ?? fallback
}

export async function validatePinterestReadiness(
  output: Output,
  opts: { mode: Mode; campaign?: { destinationUrl?: string | null } | null },
): Promise<PinterestReadinessResult> {
  const errors: PinterestReadinessResult['errors'] = []
  const add = (code: PinterestReadinessCode, message: string) => errors.push({ code, message })
  const strict = opts.mode === 'strict'

  // 1. Feature flag
  if (!FEATURES.pinterestPublishing) {
    add('pinterest_disabled', 'Pinterest publishing is not enabled.')
    return { ok: false, errors }
  }

  // 2. Channel exists and is a Pinterest channel
  if (!output.channelId) {
    add('missing_channel', 'No Pinterest account is connected for this post.')
    return { ok: false, errors }
  }
  const supabase = createServiceClient()
  const { data: channel } = await supabase
    .from('channels')
    .select('platform')
    .eq('id', output.channelId)
    .maybeSingle()
  // 'pinterest' post-dates the generated channel_platform enum type — compare as string.
  if (!channel || (channel.platform as string) !== 'pinterest') {
    add('missing_channel', 'No Pinterest account is connected for this post.')
    return { ok: false, errors }
  }

  // 3. Credentials (strict: verify refreshable)
  if (strict) {
    try {
      await getValidPinterestToken(output.channelId, output.workspaceId)
    } catch (err) {
      add(codeFrom(err, 'missing_credentials'), 'Pinterest account needs to be reconnected.')
    }
  }

  // 4–6. Board resolves, belongs to channel, and is available (DB-only in both modes)
  try {
    await resolveBoardForOutput(output)
  } catch (err) {
    add(codeFrom(err, 'missing_board'), err instanceof Error ? err.message : 'Board not available.')
  }

  // 7–8. Image: selected (lightweight) + durable/public/fetchable (strict)
  const hasAssetId = !!(output.content as OutputContent).selectedVisualAssetId
  if (!hasAssetId) {
    add('missing_image', 'Pinterest Pins require an image.')
  } else if (strict) {
    const image = await resolvePinterestImage(output)
    if (!image) {
      add('missing_image', 'The attached visual asset could not be found.')
    } else {
      try {
        await assertImageFetchable(image.url)
      } catch (err) {
        add(codeFrom(err, 'media_url_not_fetchable'), 'Pinterest cannot access this image.')
      }
    }
  }

  // 9. Destination URL present + well-formed
  let canonicalUrl: string | null = null
  try {
    canonicalUrl = resolvePinterestDestinationUrl({ output, campaign: opts.campaign })
  } catch (err) {
    add(codeFrom(err, 'missing_destination_url'), err instanceof Error ? err.message : 'Missing destination link.')
  }

  // 10. Final UTM-rendered URL carries attribution (strict)
  if (strict && canonicalUrl) {
    try {
      await tagPinterestDestination({ output, canonicalUrl })
    } catch (err) {
      add(codeFrom(err, 'utm_render_failed'), 'Could not apply tracking to the destination link.')
    }
  }

  return { ok: errors.length === 0, errors }
}

/** Convenience for publish paths: run strict and throw the first error as a PinterestApiError. */
export async function assertPinterestReadiness(
  output: Output,
  opts?: { campaign?: { destinationUrl?: string | null } | null },
): Promise<void> {
  const result = await validatePinterestReadiness(output, { mode: 'strict', campaign: opts?.campaign })
  if (!result.ok) {
    const first = result.errors[0]
    throw new PinterestApiError(first.message, 400, first.code)
  }
}
