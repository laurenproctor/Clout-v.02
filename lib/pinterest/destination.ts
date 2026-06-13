// lib/pinterest/destination.ts
// Resolves the CANONICAL (un-tagged) destination URL for a Pin. UTM tagging happens
// separately at publish time — UTM-rendered URLs are never persisted as canonical content.
//
// Priority: content.platforms.pinterest.destinationUrl -> content.destinationUrl ->
//           campaign destination (forward-compat; campaigns have no such column yet).
//
// The body is NEVER read here. A body-extracted URL is suggestion-only in Studio and must
// be user-confirmed into a canonical field before it counts — this prevents an old draft
// from becoming invisibly publishable.
import { PinterestApiError } from './types'
import { buildUTMParams, appendUTMToUrl } from '@/lib/analytics/utm'
import { loadUTMContext } from '@/lib/domain/publishing-context'
import type { Output, OutputContent } from '@/types/domain'

export function resolvePinterestDestinationUrl(params: {
  output: Output
  campaign?: { destinationUrl?: string | null } | null
}): string {
  const { output, campaign } = params
  const raw =
    output.content?.platforms?.pinterest?.destinationUrl?.trim() ||
    output.content?.destinationUrl?.trim() ||
    campaign?.destinationUrl?.trim() ||
    ''

  if (!raw) {
    throw new PinterestApiError('Pinterest Pins require a destination link.', 400, 'missing_destination_url')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new PinterestApiError('Enter a valid destination URL.', 400, 'invalid_destination_url')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new PinterestApiError('Destination URL must start with http:// or https://.', 400, 'invalid_destination_url')
  }

  return raw
}

/**
 * Appends Pinterest UTM params to the clean canonical URL. The clean URL is never mutated
 * in storage — tagging happens only at render/publish. Throws utm_render_failed if the
 * resulting URL doesn't carry utm_source (e.g. the canonical URL was unparseable).
 */
export async function tagPinterestDestination(params: {
  output: Output
  canonicalUrl: string
}): Promise<string> {
  const { output, canonicalUrl } = params
  const content = output.content as OutputContent
  const ctx = await loadUTMContext(output.workspaceId)
  const utmParams = buildUTMParams({
    platform:    'pinterest',
    canonicalId: output.generationGroupId ?? output.id,
    outputId:    output.id,
    customSources: ctx.utmSettings,
    templates:     ctx.utmTemplates,
    outputContext: {
      campaignName: content.campaignName as string | undefined,
      cta:          content.cta as string | undefined,
      lensName:     content.lensName as string | undefined,
      voice:        content.voiceRegister as string | undefined,
    },
  })
  const tagged = appendUTMToUrl(canonicalUrl, utmParams)
  if (!tagged.includes('utm_source=')) {
    throw new PinterestApiError('Could not apply tracking parameters to the destination link.', 400, 'utm_render_failed')
  }
  return tagged
}
