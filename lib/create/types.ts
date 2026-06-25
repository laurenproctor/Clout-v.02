// Minimal shared Create types. Strictly data-shaped — these describe the post
// payloads the LinkedIn slice passes around, not a generic UI framework. Other
// platforms migrate onto these as they adopt the anchor → adapt pattern.
import type { LinkedInHook } from '@/lib/linkedin/types'

// Canonical platform identifiers (verified against the social-preview layer:
// PreviewPlatform uses 'linkedin' | 'x' | 'threads'; 'twitter' normalizes to 'x').
export type CreatePlatform = 'linkedin' | 'threads' | 'x'

// The platform-native draft the user approves and adapts from.
export interface AnchorDraft {
  id: string
  platform: CreatePlatform
  body: string
  hashtags: string[]
  campaignName: string
  selectedVisualAssetId?: string | null
}

// A draft derived from an approved anchor for another platform.
export interface AdaptedDraft {
  id: string
  platform: Exclude<CreatePlatform, 'linkedin'> // 'threads' | 'x'
  sourceAnchorId: string
  body: string
  hashtags: string[]
  campaignName: string
}

// LinkedIn's anchor carries its richer editorial helpers; kept as a subtype so
// the generic AnchorDraft stays clean of platform-specific fields.
export interface LinkedInAnchorDraft extends AnchorDraft {
  platform: 'linkedin'
  hooks?: LinkedInHook[]
  mentions?: string[]
  ctaSuggestions?: string[]
}

export type AdaptTargetPlatform = AdaptedDraft['platform']
