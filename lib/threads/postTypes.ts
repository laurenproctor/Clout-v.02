import { Type, Image, Video, Link2, ListOrdered } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ThreadsPostType } from './types'

// 'id' is `ThreadsPostType | 'thread'`: 'thread' is render-only (Coming Soon) and
// not a selectable post type, so it lives outside the ThreadsPostType union.
export interface ThreadsPostTypeDefinition {
  id: ThreadsPostType | 'thread'
  label: string
  icon: LucideIcon
  description: string
  status: 'active' | 'coming_soon'
}

export const THREADS_POST_TYPES: ThreadsPostTypeDefinition[] = [
  { id: 'single', label: 'Single Post', icon: Type, description: 'One sharp observation — the Threads default.', status: 'active' },
  { id: 'image',  label: 'Image Post',  icon: Image, description: 'Pair a caption with a visual you attach.', status: 'active' },
  { id: 'video',  label: 'Video Post',  icon: Video, description: 'Caption copy that complements a video.', status: 'active' },
  { id: 'link',   label: 'Link Post',   icon: Link2, description: 'Copy that frames a source URL and earns the click.', status: 'active' },
  { id: 'thread', label: 'Thread',      icon: ListOrdered, description: 'A connected multi-post sequence.', status: 'coming_soon' },
]
