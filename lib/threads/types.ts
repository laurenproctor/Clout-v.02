export type ThreadsSourceType = 'url' | 'text' | 'upload' | 'clout_capture'

export type ThreadsAngle =
  | 'personal_observation'
  | 'contrarian_take'
  | 'quiet_insight'
  | 'open_question'

export type ThreadsAudience =
  | 'founders' | 'marketers' | 'operators' | 'engineers'
  | 'investors' | 'general_audience' | 'custom'

// Selectable post types. 'thread' is intentionally excluded — it surfaces only as
// a disabled "Coming Soon" card (see lib/threads/postTypes.ts) until multi-post
// generation, preview, and publishing support exist.
export type ThreadsPostType = 'single' | 'image' | 'video' | 'link'

export type ThreadsWorkspaceState = 'setup' | 'generating' | 'result'

export interface ThreadsGenerationRequest {
  sourceType: ThreadsSourceType
  sourceContent: string
  sourceUrl?: string
  audience: ThreadsAudience
  customAudience?: string
  lensIds: string[]
  postType?: ThreadsPostType
  // undefined = "Auto" (the model picks the strongest angle). The UI holds
  // `ThreadsAngle | 'auto'` and converts 'auto' → undefined before calling the API,
  // so undefined never doubles as "uninitialized".
  narrativeStyle?: ThreadsAngle
  cta?: string
  campaignId?: string | null
  linkUrl?: string
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
  // Carried through the draft lifecycle (optional, forward-compatible).
  postType?: ThreadsPostType
  cta?: string
  linkUrl?: string
  selectedVisualAssetId?: string | null
}
