// lib/providers/registry.ts
// Single source of truth for per-platform publishing capabilities.
// Used by the Studio UI (char counter), publishing domain (thread decision),
// and channel config defaults.

export interface ProviderCapabilities {
  platform:        string
  charLimit:       number
  threadSupport:   boolean
  canRefreshToken: boolean
}

const REGISTRY: Readonly<Record<string, ProviderCapabilities>> = {
  linkedin: {
    platform:        'linkedin',
    charLimit:       3000,
    threadSupport:   false,
    canRefreshToken: true,
  },
  x: {
    platform:        'x',
    charLimit:       280,
    threadSupport:   true,
    canRefreshToken: true,
  },
}

export function getProviderCapabilities(platform: string): ProviderCapabilities {
  const caps = REGISTRY[platform]
  if (!caps) throw new Error(`No registered provider for platform: ${platform}`)
  return caps
}

/** Returns capabilities if registered, null if not (avoids throwing for UI checks). */
export function findProviderCapabilities(platform: string): ProviderCapabilities | null {
  return REGISTRY[platform] ?? null
}
