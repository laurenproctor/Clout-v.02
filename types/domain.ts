// Domain-level types — aligned with supabase/schema.sql
// Used across lib/domain/ and components

// ─── Enums / Literals ────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type OperatorRole = 'super_admin' | 'agency_operator'
export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
export type CaptureSource = 'text' | 'voice' | 'structured' | 'url'
export type CaptureStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type GenerationStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type OutputStatus = 'draft' | 'review' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'
export type ChannelPlatform = 'linkedin' | 'newsletter' | 'twitter'
export type LensScope = 'system' | 'workspace'

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  clerkId: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  operatorRole: OperatorRole | null
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: SubscriptionPlan
  assignedOperatorId: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: WorkspaceRole
  invitedBy: string | null
  joinedAt: string
}

export interface Profile {
  id: string
  workspaceId: string
  displayName: string | null
  bio: string | null
  industries: string[]
  targetAudiences: string[]
  toneNotes: string | null
  mentalModels: Array<{ name: string; description: string }>
  philosophies: Array<{ name: string; description: string }>
  sampleContent: string[]
  purpose: string | null
  role: string | null
  industry: string | null
  expertise: string | null
  profileInsights: {
    core_belief?: string
    energized_by?: string
    misconceptions?: string
    lessons?: string
  } | null
  channels: string[]
  audienceTargets: string[]
  audiencePerception: string[]
  onboardingCompletedAt: string | null
  privateFeedOperatorVisible: boolean
  createdAt: string
  updatedAt: string
}

export interface OnboardingGeneration {
  id: string
  workspaceId: string
  positioning: string | null
  postIdeas: Array<{ hook: string; channel: string }>
  draftPost: string | null
  status: 'pending' | 'complete' | 'failed'
  createdAt: string
}

export interface Lens {
  id: string
  workspaceId: string | null
  createdBy: string | null
  scope: LensScope
  name: string
  description: string | null
  systemPrompt: string
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Capture {
  id: string
  workspaceId: string
  createdBy: string
  source: CaptureSource
  status: CaptureStatus
  rawContent: string | null
  sourceUrl: string | null
  structuredData: Record<string, unknown> | null
  audioPath: string | null
  transcript: string | null
  notes: string | null
  isPrivate: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Generation {
  id: string
  workspaceId: string
  captureId: string
  lensId: string
  profileId: string
  status: GenerationStatus
  model: string
  promptSnapshot: string | null
  rawResponse: string | null
  errorMessage: string | null
  durationMs: number | null
  tokenCount: number | null
  createdAt: string
  completedAt: string | null
}

export interface OutputContent {
  body: string
  hook?: string
  hashtags?: string[]
  wordCount?: number
  [key: string]: unknown
}

export interface Channel {
  id: string
  workspaceId: string
  platform: ChannelPlatform
  label: string | null
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

export interface OutputChannel {
  platform: ChannelPlatform
  label: string | null
}

export interface Output {
  id: string
  workspaceId: string
  generationId: string
  channelId: string | null
  status: OutputStatus
  title: string | null
  content: OutputContent
  approvedBy: string | null
  approvedAt: string | null
  providerPostId: string | null   // idempotency key
  publishedAt: string | null      // wall-clock publish time
  scheduledAt: string | null      // assigned queue slot
  lastPublishError: string | null // set on failed publish attempt
  createdAt: string
  updatedAt: string
  channels?: OutputChannel
}

export interface OutputVersion {
  id: string
  outputId: string
  versionNumber: number
  content: OutputContent
  changeSummary: string | null
  editedBy: string | null
  createdAt: string
}

export interface PrivateEnrichment {
  id: string
  captureId: string
  workspaceId: string
  lensId: string | null
  content: string
  insights: Array<{ title: string; body: string }>
  model: string
  createdAt: string
}

export interface SchedulingPreferences {
  id: string
  workspaceId: string
  postsPerWeek: number
  preferredDays: number[]   // ISO weekday: 1=Mon … 7=Sun
  preferredTimes: string[]  // HH:MM in workspace timezone
  timezone: string
  createdAt: string
  updatedAt: string
}

// ─── Input / Command Types ────────────────────────────────────────────────────

export interface CreateCaptureInput {
  workspaceId: string
  createdBy: string
  source: CaptureSource
  rawContent?: string
  sourceUrl?: string
  audioPath?: string | null
  structuredData?: Record<string, unknown>
  isPrivate?: boolean
  tags?: string[]
}

export interface UpdateCaptureInput {
  status?: CaptureStatus
  rawContent?: string
  transcript?: string
  notes?: string
  tags?: string[]
}

export interface CreateGenerationInput {
  workspaceId: string
  captureId: string
  lensId: string
  profileId: string
  model: string
}

export interface QualityScore {
  score: number
  rationale: string
  flags: string[]
}

export interface CreateWorkspaceInput {
  name: string
  slug: string
  ownerUserId: string
}

export interface UpdateWorkspaceInput {
  name?: string
  slug?: string
  plan?: SubscriptionPlan
}

export interface CreateLensInput {
  workspaceId: string
  createdBy: string
  name: string
  description?: string
  systemPrompt: string
  scope?: LensScope
  tags?: string[]
}

export interface UpdateLensInput {
  name?: string
  description?: string
  systemPrompt?: string
  tags?: string[]
  isActive?: boolean
}

export interface PublishOutputInput {
  outputId: string
  channelId?: string
}

// ─── Result Wrapper ───────────────────────────────────────────────────────────

export type DomainResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }
