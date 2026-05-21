const PLATFORM_UTM: Record<string, { source: string; medium: string }> = {
  linkedin:  { source: 'linkedin',    medium: 'social'   },
  twitter:   { source: 'x',           medium: 'social'   },
  x:         { source: 'x',           medium: 'social'   },
  threads:   { source: 'threads',     medium: 'social'   },
  facebook:  { source: 'facebook',    medium: 'social'   },
  instagram: { source: 'instagram',   medium: 'social'   },
  newsletter: { source: 'newsletter', medium: 'email'    },
  wordpress: { source: 'blog',        medium: 'organic'  },
  medium:    { source: 'medium',      medium: 'content'  },
  shopify:   { source: 'shopify',     medium: 'ecommerce'},
  substack:  { source: 'substack',    medium: 'email'    },
  google_business_profile: { source: 'google_business', medium: 'local' },
}

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
}): UTMParams {
  const platformMap = PLATFORM_UTM[params.platform] ?? { source: params.platform, medium: 'content' }
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
