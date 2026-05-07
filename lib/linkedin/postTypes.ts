import { Type, Link2, Image, LayoutGrid, BarChart2, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LinkedInPostType } from './types'

export interface PostTypeDefinition {
  id: LinkedInPostType
  label: string
  icon: LucideIcon
  description: string
  status: 'active' | 'coming_soon'
}

export const POST_TYPES: PostTypeDefinition[] = [
  { id: 'text', label: 'Text Post', icon: Type, description: 'Share insights, commentary, and thought leadership.', status: 'active' },
  { id: 'link', label: 'Link Post', icon: Link2, description: 'Drive traffic to articles, launches, and external resources.', status: 'active' },
  { id: 'image', label: 'Image Post', icon: Image, description: 'Pair visuals with narrative or commentary.', status: 'active' },
  { id: 'carousel', label: 'Carousel', icon: LayoutGrid, description: 'Multi-slide storytelling with sequential reveal.', status: 'coming_soon' },
  { id: 'poll', label: 'Poll', icon: BarChart2, description: 'Spark conversation through structured audience questions.', status: 'coming_soon' },
  { id: 'video_caption', label: 'Video Caption', icon: Video, description: 'Maximize reach on video content with strategic captions.', status: 'coming_soon' },
]
