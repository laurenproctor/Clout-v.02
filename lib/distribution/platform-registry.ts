export type UTMConfig = {
  source: string
  medium: string
  mediumToken?: 'campaign_name' | null
  campaign?: string
  content?: string
  term?: string
}

export type UTMTemplateCampaignToken = 'auto' | 'campaign_name' | 'custom'
export type UTMTemplateContentToken  = 'auto' | 'cta' | 'custom'
export type UTMTemplateTermToken     = 'none' | 'lens' | 'voice' | 'custom'

export type UTMTemplateSettings = {
  campaign: { token: UTMTemplateCampaignToken; fallback: string }
  content:  { token: UTMTemplateContentToken;  fallback: string }
  term:     { token: UTMTemplateTermToken;      fallback: string }
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
} as const

export function getPlatformDefault(platform: string): UTMConfig {
  return DISTRIBUTION_PLATFORMS[platform]?.defaultUTM ?? { source: platform, medium: 'content' }
}

export function normalizeUTMValue(value: string): string {
  return value.trim().toLowerCase()
}

export const PLATFORM_KEYS = Object.keys(DISTRIBUTION_PLATFORMS)
