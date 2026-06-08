import { describe, it, expect } from 'vitest'
import { PLATFORM_REGISTRY } from '../registry'
import type { Platform } from '../types/intelligence'

// ─── Registry compatibility tests ────────────────────────────────────────────
// These tests capture the VALUES that must survive the PlatformDefinition
// decomposition (identity / model / capabilities / generation).
// Run before migration to establish baseline. Run after migration to confirm
// no regressions. The access paths use the NEW structure — tests will fail
// with the old flat shape and pass once migration is complete.

const EXISTING_PLATFORMS: Platform[] = [
  'x', 'linkedin', 'substack', 'blog', 'threads', 'facebook', 'google_business_profile',
]

const EXPECTED_GENERATION: Record<Platform, { maxTokens: number }> = {
  x:                      { maxTokens: 160  },
  linkedin:               { maxTokens: 800  },
  substack:               { maxTokens: 1400 },
  blog:                   { maxTokens: 1600 },
  threads:                { maxTokens: 220  },
  facebook:               { maxTokens: 600  },
  google_business_profile:{ maxTokens: 350  },
  medium:                 { maxTokens: 1600 },
  bluesky:                { maxTokens: 160  },
  mastodon:               { maxTokens: 150  },
}

const EXPECTED_IDENTITY: Record<Platform, { label: string; descriptor: string }> = {
  x:                      { label: 'X',                      descriptor: 'Short-form · conversational · quotable'              },
  linkedin:               { label: 'LinkedIn',               descriptor: 'Professional · authority-driven'                     },
  substack:               { label: 'Substack',               descriptor: 'Editorial · immersive · long-form'                   },
  blog:                   { label: 'Blog',                   descriptor: 'Structured · evergreen · searchable'                 },
  threads:                { label: 'Threads',                descriptor: 'Social · conversational · reply-native'              },
  facebook:               { label: 'Facebook',               descriptor: 'Personal · story-driven · conversation-first'        },
  google_business_profile:{ label: 'Google Business Profile', descriptor: 'Local updates · search presence · trust signals'   },
  medium:                 { label: 'Medium',                 descriptor: 'Editorial · longform · authority-native'             },
  bluesky:                { label: 'Bluesky',                descriptor: 'Short-form · conversational · decentralised'         },
  mastodon:               { label: 'Mastodon',               descriptor: 'Fediverse · community-first · hashtag-native'        },
}

describe('PLATFORM_REGISTRY — structural integrity', () => {
  it('registers all 7 existing platforms plus medium', () => {
    const allPlatforms: Platform[] = [...EXISTING_PLATFORMS, 'medium']
    for (const platform of allPlatforms) {
      expect(PLATFORM_REGISTRY[platform], `${platform} missing from registry`).toBeDefined()
    }
  })

  for (const platform of EXISTING_PLATFORMS) {
    describe(`platform: ${platform}`, () => {
      it('has identity with label and descriptor', () => {
        const def = PLATFORM_REGISTRY[platform]
        expect(def.identity.label).toBe(EXPECTED_IDENTITY[platform].label)
        expect(def.identity.descriptor).toBe(EXPECTED_IDENTITY[platform].descriptor)
        expect(def.identity.id).toBe(platform)
      })

      it('has generation config with correct maxTokens', () => {
        const def = PLATFORM_REGISTRY[platform]
        expect(def.generation.maxTokens).toBe(EXPECTED_GENERATION[platform].maxTokens)
      })

      it('has a behavior model with required fields', () => {
        const def = PLATFORM_REGISTRY[platform]
        expect(def.model.rhetoricalEnvironment).toBeTruthy()
        expect(def.model.structuralRules.length).toBeGreaterThan(0)
        expect(def.model.antiPatterns.length).toBeGreaterThan(0)
        expect(def.model.lengthTarget).toBeTruthy()
      })

      it('has capabilities with required boolean fields', () => {
        const def = PLATFORM_REGISTRY[platform]
        expect(typeof def.capabilities.supportsMedia).toBe('boolean')
        expect(typeof def.capabilities.supportsThreads).toBe('boolean')
        expect(typeof def.capabilities.nativeScheduling).toBe('boolean')
        expect(typeof def.capabilities.platformScheduling).toBe('boolean')
      })
    })
  }
})

describe('PLATFORM_REGISTRY — medium platform', () => {
  it('is registered and available', () => {
    expect(PLATFORM_REGISTRY['medium']).toBeDefined()
  })

  it('has correct identity', () => {
    const def = PLATFORM_REGISTRY['medium']
    expect(def.identity.label).toBe('Medium')
    expect(def.identity.id).toBe('medium')
    expect(def.identity.descriptor).toBe('Editorial · longform · authority-native')
  })

  it('has correct generation config', () => {
    const def = PLATFORM_REGISTRY['medium']
    expect(def.generation.maxTokens).toBe(1600)
    expect(def.generation.preferredFormat).toBe('html')
  })

  it('correctly declares scheduling semantics', () => {
    const def = PLATFORM_REGISTRY['medium']
    expect(def.capabilities.nativeScheduling).toBe(false)
    expect(def.capabilities.platformScheduling).toBe(true)
  })

  it('has a behavior model with key editorial signals', () => {
    const def = PLATFORM_REGISTRY['medium']
    expect(def.model.platform).toBe('medium')
    expect(def.model.behaviorSignals?.authorityTolerance).toBe('high')
    expect(def.model.behaviorSignals?.listTolerance).toBe('low')
  })
})

describe('PLATFORM_REGISTRY — old flat access patterns fail loudly', () => {
  it('PLATFORM_REGISTRY["x"].maxTokens is undefined (moved to generation.maxTokens)', () => {
    const def = PLATFORM_REGISTRY['x'] as unknown as Record<string, unknown>
    expect(def['maxTokens']).toBeUndefined()
  })

  it('PLATFORM_REGISTRY["x"].label is undefined (moved to identity.label)', () => {
    const def = PLATFORM_REGISTRY['x'] as unknown as Record<string, unknown>
    expect(def['label']).toBeUndefined()
  })

  it('PLATFORM_REGISTRY["x"].descriptor is undefined (moved to identity.descriptor)', () => {
    const def = PLATFORM_REGISTRY['x'] as unknown as Record<string, unknown>
    expect(def['descriptor']).toBeUndefined()
  })
})
