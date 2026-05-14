import type { PublishingProvider, PublishingProviderId } from './types'
import { wordPressProvider } from './providers/wordpress'
import { shopifyProvider } from './providers/shopify'

export const PUBLISHING_REGISTRY: Partial<Record<PublishingProviderId, PublishingProvider>> = {
  wordpress: wordPressProvider,
  shopify:   shopifyProvider,
  // ghost:    ghostProvider,   ← future providers slot in here
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
  { id: 'substack',  label: 'Substack',  available: false },
  { id: 'medium',    label: 'Medium',    available: false },
  { id: 'beehiiv',   label: 'Beehiiv',   available: false },
  { id: 'notion',    label: 'Notion',    available: false },
  { id: 'hubspot',   label: 'HubSpot',   available: false },
]
