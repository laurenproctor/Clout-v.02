export type UTMConfig = {
  source: string
  medium: string
  mediumToken?: 'campaign_name' | null
  campaign?: string
  content?: string
  term?: string
}

export type UTMDateFormat = 'yyyy-mm-dd' | 'yyyy-mm' | 'yyyymmdd' | 'yyyy' | 'mmm-yyyy'
export const UTM_DATE_FORMATS: UTMDateFormat[] = ['yyyy-mm-dd', 'yyyy-mm', 'yyyymmdd', 'yyyy', 'mmm-yyyy']
export const DEFAULT_UTM_DATE_FORMAT: UTMDateFormat = 'yyyy-mm'

const MONTH_ABBREVIATIONS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const

// Formats a date into a valid UTM value (lowercase, alphanumeric + hyphens).
// Used both for the settings preview and for resolving the `date` token at publish time.
export function formatUTMDate(format: UTMDateFormat, date: Date): string {
  const yyyy = date.getFullYear().toString()
  const mm   = String(date.getMonth() + 1).padStart(2, '0')
  const dd   = String(date.getDate()).padStart(2, '0')
  const mmm  = MONTH_ABBREVIATIONS[date.getMonth()]
  switch (format) {
    case 'yyyy-mm-dd': return `${yyyy}-${mm}-${dd}`
    case 'yyyy-mm':    return `${yyyy}-${mm}`
    case 'yyyymmdd':   return `${yyyy}${mm}${dd}`
    case 'yyyy':       return yyyy
    case 'mmm-yyyy':   return `${mmm}-${yyyy}`
  }
}

export type UTMTemplateCampaignToken = 'auto' | 'campaign_name' | 'date' | 'custom'
export type UTMTemplateContentToken  = 'auto' | 'cta' | 'date' | 'custom'
export type UTMTemplateTermToken     = 'none' | 'lens' | 'voice' | 'date' | 'custom'

// How a dynamic token's fallback is produced when resolution comes back empty.
// 'text' uses the static `fallback` string; 'date' generates a date (a date can
// always be produced, so the field is never left empty). Defaults to 'text'.
export type UTMFallbackKind = 'text' | 'date'
export const UTM_FALLBACK_KINDS: UTMFallbackKind[] = ['text', 'date']

export type UTMTemplateSettings = {
  campaign: { token: UTMTemplateCampaignToken; fallback: string; fallbackKind?: UTMFallbackKind; dateFormat?: UTMDateFormat }
  content:  { token: UTMTemplateContentToken;  fallback: string; fallbackKind?: UTMFallbackKind; dateFormat?: UTMDateFormat }
  term:     { token: UTMTemplateTermToken;      fallback: string; fallbackKind?: UTMFallbackKind; dateFormat?: UTMDateFormat }
}

export const DEFAULT_UTM_TEMPLATES: UTMTemplateSettings = {
  campaign: { token: 'auto', fallback: 'clout' },
  content:  { token: 'auto', fallback: 'post'  },
  term:     { token: 'none', fallback: ''       },
}

export type PlatformEntry = {
  label: string
  defaultUTM: UTMConfig
}

export const DISTRIBUTION_PLATFORMS: Record<string, PlatformEntry> = {
  bluesky:                 { label: 'BlueSky',                 defaultUTM: { source: 'bluesky',         medium: 'social'     } },
  linkedin:                { label: 'LinkedIn',                defaultUTM: { source: 'linkedin',        medium: 'social'     } },
  x:                       { label: 'X (Twitter)',             defaultUTM: { source: 'x',               medium: 'social'     } },
  threads:                 { label: 'Threads',                 defaultUTM: { source: 'threads',         medium: 'social'     } },
  facebook:                { label: 'Facebook',                defaultUTM: { source: 'facebook',        medium: 'social'     } },
  instagram:               { label: 'Instagram',               defaultUTM: { source: 'instagram',       medium: 'social'     } },
  tiktok:                  { label: 'TikTok',                  defaultUTM: { source: 'tiktok',          medium: 'social'     } },
  newsletter:              { label: 'Newsletter',              defaultUTM: { source: 'newsletter',      medium: 'email'      } },
  wordpress:               { label: 'WordPress',               defaultUTM: { source: 'blog',            medium: 'organic'    } },
  medium:                  { label: 'Medium',                  defaultUTM: { source: 'medium',          medium: 'content'    } },
  shopify:                 { label: 'Shopify',                 defaultUTM: { source: 'shopify',         medium: 'ecommerce'  } },
  substack:                { label: 'Substack',                defaultUTM: { source: 'substack',        medium: 'email'      } },
  google_business_profile: { label: 'Google Business Profile', defaultUTM: { source: 'google_business', medium: 'local'      } },
  pinterest:               { label: 'Pinterest',               defaultUTM: { source: 'pinterest',       medium: 'social'     } },
} as const

export function getPlatformDefault(platform: string): UTMConfig {
  return DISTRIBUTION_PLATFORMS[platform]?.defaultUTM ?? { source: platform, medium: 'content' }
}

export function normalizeUTMValue(value: string): string {
  return value.trim().toLowerCase()
}

export const PLATFORM_KEYS = Object.keys(DISTRIBUTION_PLATFORMS)
