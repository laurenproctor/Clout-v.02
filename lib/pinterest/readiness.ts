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
import { resolvePinterestText, cleanPinterestTitle, cleanPinterestDescription } from './content'
import type { Output, OutputContent } from '@/types/domain'

export type PinterestReadinessCode =
  | 'pinterest_disabled' | 'missing_channel' | 'missing_credentials'
  | 'missing_board' | 'board_unavailable' | 'missing_image'
  | 'media_url_not_fetchable' | 'missing_destination_url'
  | 'invalid_destination_url' | 'utm_render_failed'
  | 'missing_title' | 'missing_description'

// Advisory only — warnings never affect `ok`. They nudge toward stronger Pinterest SEO
// (search-oriented title/description, alt text, keywords) without blocking publish.
export type PinterestWarningCode =
  | 'generic_title' | 'generic_description' | 'missing_alt_text'
  | 'missing_keywords' | 'missing_visual_text' | 'visual_text_too_long'

export interface PinterestReadinessResult {
  ok: boolean
  errors: Array<{ code: PinterestReadinessCode; message: string }>
  warnings: Array<{ code: PinterestWarningCode; message: string }>
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
  const warnings: PinterestReadinessResult['warnings'] = []
  const add = (code: PinterestReadinessCode, message: string) => errors.push({ code, message })
  const warn = (code: PinterestWarningCode, message: string) => warnings.push({ code, message })
  const strict = opts.mode === 'strict'

  // 1. Feature flag
  if (!FEATURES.pinterestPublishing) {
    add('pinterest_disabled', 'Pinterest publishing is not enabled.')
    return { ok: false, errors, warnings }
  }

  // 2. Channel exists and is a Pinterest channel
  if (!output.channelId) {
    add('missing_channel', 'No Pinterest account is connected for this post.')
    return { ok: false, errors, warnings }
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
    return { ok: false, errors, warnings }
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

  // 11–12. Title + description resolve non-empty (blockers). The resolver prefers
  // Pinterest-native content and falls back to generic output.title / content.body.
  const resolved = resolvePinterestText(output)
  if (!resolved.title) {
    add('missing_title', 'Pinterest Pins require a title.')
  }
  if (!resolved.description) {
    add('missing_description', 'Pinterest Pins require a description.')
  }

  // SEO warnings (advisory — never affect `ok`). All conditions go through the cleaners,
  // never a raw .trim() on JSONB.
  const pinterest = output.content?.platforms?.pinterest
  const hasPlatformTitle = Boolean(cleanPinterestTitle(pinterest?.title))
  if (!hasPlatformTitle && resolved.title && resolved.title === cleanPinterestTitle(output.title)) {
    warn('generic_title', 'This Pin uses the generic post title. A search-oriented Pinterest title performs better.')
  }
  const hasPlatformDescription = Boolean(cleanPinterestDescription(pinterest?.description))
  if (
    !hasPlatformDescription &&
    resolved.description &&
    resolved.description === cleanPinterestDescription(output.content?.body)
  ) {
    warn('generic_description', 'This Pin uses the generic post body. A search-led Pinterest description performs better.')
  }
  if (!resolved.altText) {
    warn('missing_alt_text', 'Add alt text describing the image for accessibility and discovery.')
  }
  if (resolved.keywords.length === 0) {
    warn('missing_keywords', 'Add keywords to guide the Pin’s title, description, and future analytics.')
  }
  if (!resolved.visualText) {
    warn('missing_visual_text', 'Add short visual text for the Pin image overlay.')
  } else if (resolved.visualText.split(/\s+/).length > 8) {
    warn('visual_text_too_long', 'Visual text is long for an image overlay — aim for a few words.')
  }

  return { ok: errors.length === 0, errors, warnings }
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
