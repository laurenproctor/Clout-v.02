export type LinkedInPostType = 'text' | 'link' | 'image' | 'carousel' | 'poll' | 'video_caption'

export type SourceIntent =
  | 'build_authority' | 'drive_discussion' | 'generate_leads'
  | 'recruit' | 'launch' | 'signal_expertise'
  | 'build_affinity' | 'increase_visibility'

export type NarrativeStyle =
  | 'story' | 'debate' | 'tactical' | 'observational' | 'visionary' | 'contrarian'

export type VoiceRegister =
  | 'executive' | 'warm' | 'technical' | 'sharp'
  | 'reserved' | 'energetic' | 'editorial'

export type LinkedInAudience =
  | 'founders' | 'enterprise_buyers' | 'marketers' | 'operators'
  | 'engineers' | 'investors' | 'recruiters'

export type LinkedInLength = 'short' | 'medium' | 'long' | 'executive_brief' | 'story_format'

export type LinkedInSourceType = 'url' | 'text' | 'upload' | 'clout_capture' | 'blog_post'

export interface LinkedInGenerationRequest {
  postType: LinkedInPostType
  sourceType: LinkedInSourceType
  sourceContent: string
  intent: SourceIntent
  narrativeStyle: NarrativeStyle
  voiceRegister: VoiceRegister
  audience: LinkedInAudience
  length: LinkedInLength
  lensIds: string[]
  sourcePostId?: string
  sourcePostType?: string
}

export interface LinkedInHook {
  type: 'statistical' | 'tension' | 'story' | 'contrarian'
  text: string
}

export interface TransformationDelta {
  changes: string[]
}

export interface LinkedInVariation {
  id: string
  label: string
  body: string
  hooks: LinkedInHook[]
  hashtags: string[]        // without # prefix
  mentions: string[]        // without @ prefix
  ctaSuggestions: string[]
  transformationDelta: TransformationDelta
  patternId?: string
  selectedVisualAssetId?: string | null  // committed visual attachment for this variation
}

export interface LinkedInGenerationResult {
  variations: LinkedInVariation[]
}

export interface PostCoaching {
  readerPsychology: {
    openingRetention: string
    dropOffRisks: string[]
    engagementDrivers: string[]
  }
  narrativeDynamics: {
    tensionMechanism: string
    pacingNotes: string
    closingStrength: string
  }
  positioningSignals: {
    authorityFraming: string
    audienceFit: string
    improvementSuggestions: string[]
  }
}

export type LinkedInWorkspaceState = 'setup' | 'generating' | 'result'
