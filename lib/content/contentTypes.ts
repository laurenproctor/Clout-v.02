// lib/content/contentTypes.ts
import type { LucideIcon } from 'lucide-react'
import { FileText, Briefcase, Mail, ImageIcon, Camera, MessageCircle, Zap } from 'lucide-react'

/**
 * Lifecycle status of a content type.
 * - active: fully available, linked to a route
 * - coming_soon: visible but not yet functional
 * - beta / experimental: reserved for future gated rollouts
 * - internal: reserved for operator-only types
 */
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
    ctaLabel: 'Create LinkedIn Post',
    route: '/create/linkedin',
    status: 'active',
    icon: Briefcase,
  },
  {
    id: 'threads',
    title: 'Threads Post',
    description:
      'Authentic engagement — create real conversations and build genuine connections with your audience.',
    ctaLabel: 'Create Threads Post',
    route: '/create/threads',
    status: 'active',
    icon: MessageCircle,
  },
  {
    id: 'image',
    title: 'Create Image',
    description:
      'Generate brand-consistent social images — quote cards, headline banners, editorial photography, and more.',
    ctaLabel: 'Create Image',
    route: '/create/image',
    status: 'active',
    icon: ImageIcon,
  },
  {
    id: 'instagram',
    title: 'Instagram Post',
    description:
      'Create platform native Instagram content including captions, carousel slides, quote graphics, educational content, and branded visual assets.',
    ctaLabel: 'Create Instagram Post',
    route: '/create/instagram',
    status: 'active',
    icon: Camera,
  },
  {
    id: 'substack-note',
    title: 'Note',
    description: 'Short observations and insights — write once, publish anywhere.',
    ctaLabel: 'Write a Note',
    route: '/create/note',
    status: 'active',
    icon: Zap,
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

/** Pre-filtered slices used by the Create hub page. Add new slices here when new statuses are promoted. */
export const activeTypes = CONTENT_TYPES.filter((t) => t.status === 'active')
export const comingSoonTypes = CONTENT_TYPES.filter((t) => t.status === 'coming_soon')
