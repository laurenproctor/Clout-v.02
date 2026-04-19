// Domain-level types for Clout

// ─── Enums / Literals ────────────────────────────────────────────────────────

export type WorkspacePlan = 'free' | 'pro' | 'enterprise'
export type WorkspaceRole = 'owner' | 'admin' | 'member'
export type CaptureStatus = 'draft' | 'processing' | 'ready' | 'failed'
export type LensVisibility = 'private' | 'workspace' | 'public'
export type GenerationStatus = 'queued' | 'running' | 'completed' | 'failed'
export type OutputFormat = 'tweet' | 'thread' | 'linkedin' | 'newsletter' | 'blog' | 'email'
export type QualityScore = 1 | 2 | 3 | 4 | 5

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: WorkspacePlan
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: WorkspaceRole
  joinedAt: Date
}

export interface Profile {
  id: string
  userId: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Capture {
  id: string
  workspaceId: string
  createdByUserId: string
  title: string
  rawContent: string
  summary: string | null
  tags: string[]
  status: CaptureStatus
  sourceUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Lens {
  id: string
  workspaceId: string
  createdByUserId: string
  name: string
  description: string | null
  systemPrompt: string
  visibility: LensVisibility
  createdAt: Date
  updatedAt: Date
}

export interface Generation {
  id: string
  workspaceId: string
  captureId: string
  lensId: string
  triggeredByUserId: string
  status: GenerationStatus
  outputFormat: OutputFormat
  rawPrompt: string | null
  rawResponse: string | null
  qualityScore: QualityScore | null
  qualityFeedback: string | null
  createdAt: Date
  completedAt: Date | null
}

export interface Output {
  id: string
  generationId: string
  workspaceId: string
  format: OutputFormat
  content: string
  metadata: Record<string, unknown>
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UsageLedger {
  id: string
  workspaceId: string
  periodStart: Date
  periodEnd: Date
  generationsUsed: number
  generationsLimit: number
  createdAt: Date
}

// ─── Input / Command Types ────────────────────────────────────────────────────

export interface CreateWorkspaceInput {
  name: string
  slug: string
  ownerUserId: string
}

export interface UpdateWorkspaceInput {
  name?: string
  slug?: string
  plan?: WorkspacePlan
}

export interface CreateCaptureInput {
  workspaceId: string
  createdByUserId: string
  title: string
  rawContent: string
  tags?: string[]
  sourceUrl?: string
}

export interface UpdateCaptureInput {
  title?: string
  rawContent?: string
  summary?: string
  tags?: string[]
  status?: CaptureStatus
}

export interface CreateLensInput {
  workspaceId: string
  createdByUserId: string
  name: string
  description?: string
  systemPrompt: string
  visibility?: LensVisibility
}

export interface UpdateLensInput {
  name?: string
  description?: string
  systemPrompt?: string
  visibility?: LensVisibility
}

export interface CreateGenerationInput {
  workspaceId: string
  captureId: string
  lensId: string
  triggeredByUserId: string
  outputFormat: OutputFormat
}

export interface QualityEvaluationInput {
  generationId: string
  score: QualityScore
  feedback?: string
}

export interface PublishOutputInput {
  outputId: string
  publishedAt?: Date
}

// ─── Result Wrappers ─────────────────────────────────────────────────────────

export type DomainResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }
