export type ThreadsSourceType = 'url' | 'text' | 'upload' | 'clout_capture'

export type ThreadsAngle =
  | 'personal_observation'
  | 'contrarian_take'
  | 'quiet_insight'
  | 'open_question'

export type ThreadsAudience =
  | 'founders' | 'marketers' | 'operators' | 'engineers'
  | 'investors' | 'general_audience' | 'custom'

export type ThreadsWorkspaceState = 'setup' | 'generating' | 'result'

export interface ThreadsGenerationRequest {
  sourceType: ThreadsSourceType
  sourceContent: string
  sourceUrl?: string
  audience: ThreadsAudience
  customAudience?: string
  lensIds: string[]
}

// Forward-compatible variation shape — only primaryText used today;
// continuationPosts/mediaPrompt reserved for future thread chains and media posts.
export interface ThreadsVariation {
  id: string
  label: string           // "Observation" | "Contrarian" | "Insight" | "Question"
  campaignName: string
  primaryText: string     // the post text, max 500 chars
  continuationPosts?: string[]  // reserved: future thread chains
  mediaPrompt?: string    // reserved: future image/video prompts
  angle: ThreadsAngle
  openingLine: string
  hashtag: string | null  // 0 or 1 only
}
