import type { PublishingProvider, PublishingProviderId } from './types'
import { wordPressProvider } from './providers/wordpress'
import { shopifyProvider } from './providers/shopify'
import { mediumProvider } from './providers/medium'
import { substackProvider } from './providers/substack'
import { FEATURES } from '@/lib/features'

export const PUBLISHING_REGISTRY: Partial<Record<PublishingProviderId, PublishingProvider>> = {
  wordpress: wordPressProvider,
  shopify:   shopifyProvider,
  medium:    mediumProvider,
  // ghost:    ghostProvider,   ← future providers slot in here
  ...(FEATURES.substackPublishing ? { substack: substackProvider } : {}),
}

export function getProvider(id: PublishingProviderId): PublishingProvider {
  const provider = PUBLISHING_REGISTRY[id]
  if (!provider) throw new Error(`Publishing provider "${id}" is not registered.`)
  return provider
}

export interface ProviderMeta {
  id: PublishingProviderId
  label: string
  available: boolean
}

export const ALL_PROVIDERS: ProviderMeta[] = [
  { id: 'wordpress', label: 'WordPress', available: true  },
  { id: 'shopify',   label: 'Shopify',   available: true  },
  { id: 'ghost',     label: 'Ghost',     available: false },
  { id: 'webflow',   label: 'Webflow',   available: false },
  { id: 'substack',  label: 'Substack',  available: FEATURES.substackPublishing },
  { id: 'medium',    label: 'Medium',    available: true  },
  { id: 'beehiiv',   label: 'Beehiiv',   available: false },
  { id: 'notion',    label: 'Notion',    available: false },
  { id: 'hubspot',   label: 'HubSpot',   available: false },
]
