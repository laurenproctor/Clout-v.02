import {
  getPlatformDefault,
  UTMConfig,
  UTMTemplateSettings,
  normalizeUTMValue,
} from '@/lib/distribution/platform-registry'

export type { UTMConfig }

export interface UTMParams {
  utm_source:   string
  utm_medium:   string
  utm_campaign: string
  utm_content?: string
  utm_term?:    string
}

export interface UTMOutputContext {
  campaignName?: string
  cta?:          string
  lensName?:     string
  voice?:        string
  topic?:        string
}

// Normalizes a token value: trim + lowercase + replace spaces with hyphens.
// Returns empty string if the result is empty (triggers fallback).
function normalizeToken(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
}

export function buildUTMParams(params: {
  platform:       string
  canonicalId:    string
  outputId:       string
  customSources?: Record<string, UTMConfig>
  outputContext?: UTMOutputContext
  templates?:     UTMTemplateSettings
}): UTMParams {
  const { platform, canonicalId, outputId, customSources, outputContext, templates } = params
  const platformCfg = customSources?.[platform] ?? getPlatformDefault(platform)

  // ── utm_source ────────────────────────────────────────────────────────────
  const utm_source = platformCfg.source

  // ── utm_medium ────────────────────────────────────────────────────────────
  let utm_medium = platformCfg.medium
  if (platformCfg.mediumToken === 'campaign_name') {
    const resolved = normalizeToken(outputContext?.campaignName)
    if (resolved) utm_medium = resolved
  } else if (platformCfg.mediumToken === 'topic') {
    const resolved = normalizeToken(outputContext?.topic)
    if (resolved) utm_medium = resolved
  }

  // ── utm_campaign ──────────────────────────────────────────────────────────
  let utm_campaign: string
  if (!templates || templates.campaign.token === 'auto') {
    utm_campaign = `clout_c_${canonicalId.replace(/-/g, '').slice(0, 12)}`
  } else if (templates.campaign.token === 'campaign_name') {
    const resolved = normalizeToken(outputContext?.campaignName)
    utm_campaign = resolved || templates.campaign.fallback
  } else {
    // custom
    utm_campaign = templates.campaign.fallback
  }

  // ── utm_content ───────────────────────────────────────────────────────────
  let utm_content: string | undefined
  if (!templates || templates.content.token === 'auto') {
    utm_content = `out_${outputId.replace(/-/g, '').slice(0, 12)}`
  } else if (templates.content.token === 'cta') {
    const resolved = normalizeToken(outputContext?.cta)
    utm_content = resolved || templates.content.fallback || undefined
  } else {
    // custom
    utm_content = templates.content.fallback || undefined
  }

  // ── utm_term ──────────────────────────────────────────────────────────────
  let utm_term: string | undefined
  if (templates && templates.term.token !== 'none') {
    if (templates.term.token === 'lens') {
      const resolved = normalizeToken(outputContext?.lensName)
      utm_term = resolved || templates.term.fallback || undefined
    } else if (templates.term.token === 'voice') {
      const resolved = normalizeToken(outputContext?.voice)
      utm_term = resolved || templates.term.fallback || undefined
    } else {
      // custom
      utm_term = templates.term.fallback || undefined
    }
  }

  return { utm_source, utm_medium, utm_campaign, utm_content, utm_term }
}

export function appendUTMToUrl(baseUrl: string, utmParams: UTMParams): string {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source',   utmParams.utm_source)
    url.searchParams.set('utm_medium',   utmParams.utm_medium)
    url.searchParams.set('utm_campaign', utmParams.utm_campaign)
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content)
    if (utmParams.utm_term)    url.searchParams.set('utm_term',    utmParams.utm_term)
    return url.toString()
  } catch {
    return baseUrl
  }
}

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

export function injectUTMIntoContent(body: string, utmParams: UTMParams): string {
  return body.replace(/https?:\/\/[^\s<>"')\]]+/g, (url) => {
    if (!shouldTagUrl(url)) return url
    return appendUTMToUrl(url, utmParams)
  })
}
