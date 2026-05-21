// Domain-level types — aligned with supabase/schema.sql
// Used across lib/domain/ and components

import type { NarrativeRole, NarrativeGoal, FunnelStage, ResonancePrediction } from './calendar'

// ─── Enums / Literals ────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type OperatorRole = 'super_admin' | 'agency_operator'
export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
export type CaptureSource = 'text' | 'voice' | 'structured' | 'url' | 'topic'

export interface ResearchSource {
  title: string
  url: string
  snippet?: string
  score?: number
}

export interface Angle {
  id: string
  title: string
  summary: string
  rationale: string
  recommendedLensId?: string | null
}

export type CaptureStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type GenerationStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type OutputStatus = 'draft' | 'review' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'
export type ChannelPlatform = 'linkedin' | 'newsletter' | 'x' | 'twitter' | 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'wordpress' | 'shopify' | 'google_business_profile'
export type LensScope = 'system' | 'workspace'
export type EmailType = 'welcome' | 'output_ready' | 'payment_failed'
export type EmailStatus = 'pending' | 'sent' | 'failed'

export type EmailPayload =
  | { type: 'welcome'; userId: string; email: string; displayName: string }
  | { type: 'output_ready'; outputId: string; userId: string; email: string; outputTitle: string; outputBody: string }
  | { type: 'payment_failed'; workspaceId: string; invoiceId: string; email: string; planName: string; amount: number; currency: string; gracePeriodDays: number }

export interface EmailEvent {
  id: string
  idempotencyKey: string
  type: EmailType
  recipientEmail: string
  userId: string | null
  workspaceId: string | null
  payload: EmailPayload | null
  status: EmailStatus
  resendId: string | null
  error: string | null
  attemptCount: number
  lastAttemptedAt: string | null
  sentAt: string | null
  createdAt: string
}

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
  lensType: string | null  // null = standard; 'framework' = Framework Lens pipeline
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
  researchSources: ResearchSource[] | null
  researchSummary: string | null
  extractedAngles: Angle[] | null
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
  angleId: string | null
  generationGroupId: string | null
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

export interface PerformanceSnapshot {
  impressions: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  providerPostUrl: string | null
  syncedAt: string | null
}

export interface Channel {
  id: string
  workspaceId: string
  platform: ChannelPlatform
  label: string | null
  accountId: string | null
  accountType: 'personal' | 'page' | 'business'
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
  generationId: string | null
  channelId: string | null
  status: OutputStatus
  title: string | null
  content: OutputContent
  approvedBy: string | null
  approvedAt: string | null
  providerPostId:  string | null   // idempotency key
  providerPostUrl: string | null   // human-readable link to the published post
  publishedAt:     string | null   // wall-clock publish time
  scheduledAt: string | null      // assigned queue slot
  lastPublishError: string | null  // set on failed publish attempt
  generationGroupId:    string | null
  approvedForWeek:      boolean
  weekBucket:           string | null
  performanceSnapshot:  PerformanceSnapshot | null
  narrativeRole: NarrativeRole | null
  narrativeArcId: string | null
  narrativeArcName: string | null
  goal: NarrativeGoal | null
  funnelStage: FunnelStage | null
  resonancePrediction: ResonancePrediction | null
  conceptId: string | null
  // ─── Content lineage (graph-ready) ──────────────────────────────────────────
  // Tracks derivation chains for analytics attribution, duplicate detection,
  // resonance learning, and narrative evolution.
  // sourceContentIds supports multi-parent derivation (articles assembled from
  // multiple sources, newsletters from multiple outputs, synthesis workflows).
  // sourcePlatform uses open string to outlive providers and platform availability.
  sourceContentIds?:         string[] | null
  primarySourceContentId?:   string | null
  derivationType?:           'expansion' | 'compression' | 'teaser' | 'thread' | 'newsletter' | 'translation' | null
  sourcePlatform?:           string | null
  createdAt: string
  updatedAt: string
  channels?: OutputChannel
}

export interface WeeklyPlanItem {
  output: Output
  suggestedSlot: string | null  // ISO UTC — a preview, not committed until approved
  rank: number
  selection_reason: string      // Why this draft was selected for the week
}

export interface PerformanceSummary {
  publishedLast30Days: number
  topPostingDay: string | null   // e.g. "Tuesday" — day most posts are published
  topPostingHour: number | null  // e.g. 9 — hour (0-23) most posts are published
  weekBucket: string             // ISO date of current Monday
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

// ─── Assistant System ─────────────────────────────────────────────────────────

// What structural form the output takes
export type OutputFormat = 'post' | 'thread' | 'newsletter' | 'article' | 'note'

// What the user is trying to do (orthogonal to format)
export type IntentClass =
  | 'publish'
  | 'reflect'
  | 'brainstorm'
  | 'educate'
  | 'summarize'
  | 'document'
  | 'debate'

export type AssistantTone =
  | 'professional'
  | 'casual'
  | 'educational'
  | 'personal'
  | 'reflective'
  | 'contrarian'

export interface InferredIntent {
  intentClass: IntentClass
  outputFormat: OutputFormat
  isPrivate: boolean
  publishIntent: boolean
  tone: AssistantTone
  suggestedChannel: 'linkedin' | 'twitter' | 'newsletter' | null
  confidence: {
    format: number
    privacy: number
    publishIntent: number
    tone: number
  }
}

export interface NormalizedGoal {
  intentClass: IntentClass
  outputFormat: OutputFormat
  tone: AssistantTone
  isPrivate: boolean
  suggestedChannel: InferredIntent['suggestedChannel']
  generationHint: string
}

export interface AssistantSession {
  id: string
  workspaceId: string
  captureId: string | null
  userId: string | null
  status: 'active' | 'completed' | 'failed'
  metadata: Record<string, unknown>
  createdAt: string
  completedAt: string | null
}
