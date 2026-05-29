import { getPlatformDefault, UTMConfig } from '@/lib/distribution/platform-registry'

export type { UTMConfig }

export interface UTMParams {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content?: string
}

export function buildUTMParams(params: {
  platform: string
  canonicalId: string   // generationGroupId or outputId — the content batch identifier
  outputId: string      // the specific output being published
  customSources?: Record<string, UTMConfig>
}): UTMParams {
  const platformMap = params.customSources?.[params.platform] ?? getPlatformDefault(params.platform)
  return {
    utm_source: platformMap.source,
    utm_medium: platformMap.medium,
    // Deterministic prefixed IDs for joining analytics_events back to content_attribution
    utm_campaign: `clout_c_${params.canonicalId.replace(/-/g, '').slice(0, 12)}`,
    utm_content: `out_${params.outputId.replace(/-/g, '').slice(0, 12)}`,
  }
}

export function appendUTMToUrl(baseUrl: string, utmParams: UTMParams): string {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source', utmParams.utm_source)
    url.searchParams.set('utm_medium', utmParams.utm_medium)
    url.searchParams.set('utm_campaign', utmParams.utm_campaign)
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content)
    return url.toString()
  } catch {
    return baseUrl
  }
}

// Hostnames that should never receive UTM tagging — these are the platforms the
// content is being published ON, not the creator's destination website.
const SKIP_UTM_HOSTNAMES = new Set([
  'linkedin.com', 'twitter.com', 'x.com', 'threads.net', 'facebook.com',
  'instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be', 't.co',
  'medium.com', 'substack.com', 'wordpress.com', 'shopify.com',
])

function shouldTagUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, '')
    return !SKIP_UTM_HOSTNAMES.has(hostname)
  } catch {
    return false
  }
}

// Finds http/https URLs in post body text and appends UTM params to any that
// point to the creator's own website (skipping known social/publisher domains).
export function injectUTMIntoContent(body: string, utmParams: UTMParams): string {
  return body.replace(/https?:\/\/[^\s<>"')\]]+/g, (url) => {
    if (!shouldTagUrl(url)) return url
    return appendUTMToUrl(url, utmParams)
  })
}
