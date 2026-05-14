import type { Platform } from './types/intelligence'
import type { PlatformBehaviorModel } from './types/platform'
import { X_PLATFORM_MODEL } from './platforms/x'
import { LINKEDIN_PLATFORM_MODEL } from './platforms/linkedin'
import { SUBSTACK_PLATFORM_MODEL } from './platforms/substack'
import { BLOG_PLATFORM_MODEL } from './platforms/blog'
import { THREADS_PLATFORM_MODEL } from './platforms/threads'
import { FACEBOOK_PLATFORM_MODEL } from './platforms/facebook'
import { GBP_PLATFORM_MODEL } from './platforms/google-business-profile'

// The registry is the single authoritative source for all platform behavior.
// Future fields (validator, formatter, publisher, analytics) are commented as
// stub signatures — add them as each subsystem is built.
export interface PlatformDefinition {
  id: Platform
  label: string
  descriptor: string
  maxTokens: number
  model: PlatformBehaviorModel
  // validator?: (text: string) => import('./validation/types').ValidationResult
  // formatter?: (content: import('@/types/domain').OutputContent) => string
  // publisher?: (...args: unknown[]) => Promise<unknown>
  // analytics?: unknown
}

export const PLATFORM_REGISTRY: Record<Platform, PlatformDefinition> = {
  x: {
    id: 'x',
    label: 'X',
    descriptor: 'Short-form · conversational · quotable',
    maxTokens: 160,
    model: X_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    descriptor: 'Professional · authority-driven',
    maxTokens: 800,
    model: LINKEDIN_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  substack: {
    id: 'substack',
    label: 'Substack',
    descriptor: 'Editorial · immersive · long-form',
    maxTokens: 1400,
    model: SUBSTACK_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  blog: {
    id: 'blog',
    label: 'Blog',
    descriptor: 'Structured · evergreen · searchable',
    maxTokens: 1600,
    model: BLOG_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  threads: {
    id: 'threads',
    label: 'Threads',
    descriptor: 'Social · conversational · reply-native',
    maxTokens: 220,
    model: THREADS_PLATFORM_MODEL,
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    descriptor: 'Personal · story-driven · conversation-first',
    maxTokens: 600,
    model: FACEBOOK_PLATFORM_MODEL as PlatformBehaviorModel,
  },
  google_business_profile: {
    id: 'google_business_profile',
    label: 'Google Business Profile',
    descriptor: 'Local updates · search presence · trust signals',
    maxTokens: 350,
    model: GBP_PLATFORM_MODEL as PlatformBehaviorModel,
  },
}
