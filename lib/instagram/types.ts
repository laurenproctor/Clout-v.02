import type { SourceIntent, LinkedInAudience } from '@/lib/linkedin/types'

export type InstagramVisualFormat =
  | 'educational_carousel'
  | 'quote_graphic'
  | 'framework'
  | 'narrative_story'
  | 'data_insight'
  | 'let_clout_decide'

export type InstagramVisualStyle =
  | 'founder'
  | 'editorial'
  | 'luxury'
  | 'modern'
  | 'minimal'
  | 'bold'
  | 'auto'

export type InstagramSourceType = 'url' | 'text' | 'upload' | 'clout_capture' | 'blog_post'

export interface InstagramGenerationRequest {
  visualFormat: InstagramVisualFormat
  visualStyle: InstagramVisualStyle
  sourceType: InstagramSourceType
  sourceContent: string
  sourceUrl?: string
  intent: SourceIntent
  audience: LinkedInAudience
  customAudience?: string
  lensIds: string[]
}

export interface InstagramSlide {
  position: number
  role:
    | 'hook'
    | 'insight'
    | 'supporting'
    | 'cta'
    | 'situation'
    | 'tension'
    | 'discovery'
    | 'lesson'
    | 'takeaway'
    | 'data'
    | 'implication'
    | 'so_what'
    | 'step'
    | 'problem'
    | 'summary'
  headline: string
  body: string
}

export interface SlideLayout {
  position: number
  role: string
}

export interface VisualPlan {
  templateId: string
  styleId: string
  visualNarrative: string
  aspectRatio: string
  slideLayouts: SlideLayout[]
  renderEngine: 'html'
  renderTarget: 'instagram' | 'linkedin' | 'newsletter' | 'pdf'
}

export interface VisualTemplate {
  id: string
  name: string
  category: 'carousel' | 'quote' | 'framework' | 'narrative' | 'statistic'
  renderComponent: string
}

export interface ContentIntelligence {
  formatRationale: string
  captionStrategy: string
  visualNarrative: string
}

export interface InstagramVariation {
  id: string
  label: string
  campaignName: string
  caption: string
  hashtags: string[]
  slides: InstagramSlide[]
  visualPlan: VisualPlan
  intelligence: ContentIntelligence
  resolvedFormat: InstagramVisualFormat
  resolvedStyle: InstagramVisualStyle
  visualAssetIds?: string[]
  selectedVisualAssetId?: string | null
}

export type InstagramWorkspaceState = 'setup' | 'strategy_preview' | 'generating' | 'result'
