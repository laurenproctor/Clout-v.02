import type { OutputStatus, ChannelPlatform } from './domain'

export type NarrativeRole =
  | 'contrarian'
  | 'framework'
  | 'evidence'
  | 'cta'
  | 'tension'
  | 'founder'

export type NarrativeGoal =
  | 'authority'
  | 'conversation'
  | 'leads'
  | 'loyalty'
  | 'education'
  | 'subscribers'
  | 'positioning'
  | 'retention'

export type FunnelStage =
  | 'top'
  | 'awareness'
  | 'trust'
  | 'consideration'
  | 'conversion'
  | 'retention'

export type ResonancePrediction = 'high' | 'medium' | 'low'

export type IntelligenceLevel = 'danger' | 'warn' | 'good'

export interface CalendarPost {
  id: string
  platform: ChannelPlatform
  accountName: string
  handle: string | null
  status: OutputStatus
  scheduledAt: string | null
  channelId: string
}

export interface CalendarConcept {
  conceptId: string
  headline: string
  scheduledAt: string
  goal: NarrativeGoal | null
  narrativeRole: NarrativeRole | null
  narrativeArcId: string | null
  narrativeArcName: string | null
  funnelStage: FunnelStage | null
  resonancePrediction: ResonancePrediction | null
  lensNames: string[]
  posts: CalendarPost[]
}

export interface IntelligenceSignal {
  level: IntelligenceLevel
  label: string
  detail: string
}

export interface NarrativeHealth {
  score: number
  strengths: string[]
  gaps: string[]
}

export type ArcFunnelStep = {
  label: string
  state: 'done' | 'active' | 'pending'
}

export interface NarrativeArc {
  arcId: string
  arcName: string
  arcDescription: string
  goal: NarrativeGoal | null
  status: 'active' | 'paused' | 'completed'
  resonance: ResonancePrediction | null
  stage: string
  platforms: string[]
  totalConcepts: number
  totalPosts: number
  weeksRunning: number
  funnelSteps: ArcFunnelStep[]
  concepts: CalendarConcept[]
  // True for the synthetic group of scheduled posts not yet assigned to a
  // narrative arc. These still appear in the narrative view so nothing the
  // grid shows is silently hidden.
  standalone?: boolean
}
