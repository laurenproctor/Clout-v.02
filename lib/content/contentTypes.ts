// lib/content/contentTypes.ts
import type { LucideIcon } from 'lucide-react'
import { FileText, MessageSquare, Mail } from 'lucide-react'

export type ContentTypeStatus =
  | 'active'
  | 'coming_soon'
  | 'beta'
  | 'experimental'
  | 'internal'

export interface ContentType {
  id: string
  title: string
  description: string
  /** Action label — only defined for active/beta/experimental types */
  ctaLabel?: string
  /** Availability label rendered as a muted pill — never a button */
  statusLabel?: string
  /** Destination route — undefined means not yet routed */
  route?: string
  status: ContentTypeStatus
  icon: LucideIcon
}

export const CONTENT_TYPES: ContentType[] = [
  {
    id: 'blog',
    title: 'Blog Post',
    description:
      'Generate SEO-ready long-form content with titles, metadata, structure, and AI-assisted writing workflows.',
    ctaLabel: 'Create Blog Post',
    route: '/create/blog',
    status: 'active',
    icon: FileText,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Post',
    description:
      'Create professional thought leadership content optimized for reach, credibility, and engagement.',
    statusLabel: 'Coming Soon',
    status: 'coming_soon',
    icon: MessageSquare,
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    description:
      'Build editorial newsletters with recurring formats, curated sections, and audience-first structure.',
    statusLabel: 'Coming Soon',
    status: 'coming_soon',
    icon: Mail,
  },
]

export const activeTypes = CONTENT_TYPES.filter((t) => t.status === 'active')
export const comingSoonTypes = CONTENT_TYPES.filter((t) => t.status === 'coming_soon')
