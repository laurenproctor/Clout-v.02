import type { Platform } from './types/intelligence'
import type { PlatformBehaviorModel } from './types/platform'
import { X_PLATFORM_MODEL } from './platforms/x'
import { LINKEDIN_PLATFORM_MODEL } from './platforms/linkedin'
import { SUBSTACK_PLATFORM_MODEL } from './platforms/substack'
import { BLOG_PLATFORM_MODEL } from './platforms/blog'
import { THREADS_PLATFORM_MODEL } from './platforms/threads'
import { FACEBOOK_PLATFORM_MODEL } from './platforms/facebook'
import { GBP_PLATFORM_MODEL } from './platforms/google-business-profile'
import { MEDIUM_PLATFORM_MODEL } from './platforms/medium'

// ─── Identity ─────────────────────────────────────────────────────────────────

export interface PlatformIdentity {
  id: Platform
  label: string
  descriptor: string
}

// ─── Capabilities ─────────────────────────────────────────────────────────────
// What the platform CAN DO — no generation concerns here.
// supportsScheduling (old) split into nativeScheduling + platformScheduling.

export interface PlatformRegistryCapabilities {
  supportsThreads: boolean
  supportsMedia: boolean
  supportsCarousel: boolean
  supportsPolls: boolean
  nativeScheduling: boolean     // platform API supports server-side scheduled publish
  platformScheduling: boolean   // Clout queue can simulate scheduling
}

// ─── Generation ───────────────────────────────────────────────────────────────
// How content should be GENERATED — not platform capabilities.
// maxPostLength + softPostLength live here, not in capabilities.

export interface PlatformGenerationConfig {
  maxTokens: number
  maxPostLength?: number
  softPostLength?: number
  temperature?: number
  preferredFormat?: 'html' | 'markdown' | 'text'
}

// ─── PlatformDefinition ───────────────────────────────────────────────────────
// The single authoritative record per platform.
// Future fields (validator, formatter, publisher, analytics) are commented as
// stub signatures — add them as each subsystem is built.

export interface PlatformDefinition {
  identity: PlatformIdentity
  model: PlatformBehaviorModel
  capabilities: PlatformRegistryCapabilities
  generation: PlatformGenerationConfig
  // validator?: (text: string) => import('./validation/types').ValidationResult
  // formatter?: (content: import('@/types/domain').OutputContent) => string
  // publisher?: (...args: unknown[]) => Promise<unknown>
  // analytics?: unknown
}

export const PLATFORM_REGISTRY: Record<Platform, PlatformDefinition> = {
  x: {
    identity: {
      id: 'x',
      label: 'X',
      descriptor: 'Short-form · conversational · quotable',
    },
    model: X_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: true,
      supportsMedia: true,
      supportsCarousel: false,
      supportsPolls: true,
      nativeScheduling: false,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 160,
      maxPostLength: 280,
      softPostLength: 220,
    },
  },

  linkedin: {
    identity: {
      id: 'linkedin',
      label: 'LinkedIn',
      descriptor: 'Professional · authority-driven',
    },
    model: LINKEDIN_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: true,
      supportsPolls: true,
      nativeScheduling: false,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 800,
      maxPostLength: 3000,
      softPostLength: 1300,
    },
  },

  substack: {
    identity: {
      id: 'substack',
      label: 'Substack',
      descriptor: 'Editorial · immersive · long-form',
    },
    model: SUBSTACK_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: false,
      supportsPolls: false,
      nativeScheduling: true,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 1400,
      preferredFormat: 'html',
    },
  },

  blog: {
    identity: {
      id: 'blog',
      label: 'Blog',
      descriptor: 'Structured · evergreen · searchable',
    },
    model: BLOG_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: false,
      supportsPolls: false,
      nativeScheduling: true,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 1600,
      preferredFormat: 'html',
    },
  },

  threads: {
    identity: {
      id: 'threads',
      label: 'Threads',
      descriptor: 'Social · conversational · reply-native',
    },
    model: THREADS_PLATFORM_MODEL,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: false,
      supportsPolls: false,
      nativeScheduling: false,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 220,
      maxPostLength: 500,
      softPostLength: 200,
    },
  },

  facebook: {
    identity: {
      id: 'facebook',
      label: 'Facebook',
      descriptor: 'Personal · story-driven · conversation-first',
    },
    model: FACEBOOK_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: true,
      supportsPolls: false,
      nativeScheduling: false,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 600,
      maxPostLength: 63206,
      softPostLength: 500,
    },
  },

  google_business_profile: {
    identity: {
      id: 'google_business_profile',
      label: 'Google Business Profile',
      descriptor: 'Local updates · search presence · trust signals',
    },
    model: GBP_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: false,
      supportsPolls: false,
      nativeScheduling: false,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 350,
      maxPostLength: 1500,
      softPostLength: 300,
    },
  },

  medium: {
    identity: {
      id: 'medium',
      label: 'Medium',
      descriptor: 'Editorial · longform · authority-native',
    },
    model: MEDIUM_PLATFORM_MODEL as PlatformBehaviorModel,
    capabilities: {
      supportsThreads: false,
      supportsMedia: true,
      supportsCarousel: false,
      supportsPolls: false,
      nativeScheduling: false,
      platformScheduling: true,
    },
    generation: {
      maxTokens: 1600,
      preferredFormat: 'html',
    },
  },
}
