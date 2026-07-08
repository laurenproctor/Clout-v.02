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
      'Start with a blog-first, SEO-ready long-form piece, then adapt it into LinkedIn, Threads, or a Substack email.',
    ctaLabel: 'Start with blog',
    route: '/create/blog',
    status: 'active',
    icon: FileText,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Post',
    description:
      'Create a LinkedIn-first thought leadership post, then adapt it for Threads, Substack, Instagram, or blog.',
    ctaLabel: 'Start with LinkedIn',
    route: '/create/linkedin',
    status: 'active',
    icon: Briefcase,
  },
  {
    id: 'threads',
    title: 'Threads Post',
    description:
      'Open a conversation with a Threads-first post, then expand it into LinkedIn, a blog, or a Substack note.',
    ctaLabel: 'Start with Threads',
    route: '/create/threads',
    status: 'active',
    icon: MessageCircle,
  },
  {
    id: 'image',
    title: 'Create Image',
    description:
      'Create a brand-consistent visual asset, then attach it to platform-specific content in Studio.',
    ctaLabel: 'Start with image',
    route: '/create/image',
    status: 'active',
    icon: ImageIcon,
  },
  {
    id: 'instagram',
    title: 'Instagram Post',
    description:
      'Build an Instagram-first caption and carousel, then adapt the message for LinkedIn, Threads, or a note.',
    ctaLabel: 'Start with Instagram',
    route: '/create/instagram',
    status: 'active',
    icon: Camera,
  },
  {
    id: 'substack-note',
    title: 'Note',
    description:
      'Capture a short, note-first observation, then expand it into a post, thread, or long-form email later.',
    ctaLabel: 'Start with note',
    route: '/create/note',
    status: 'active',
    icon: Zap,
  },
  {
    id: 'substack-email',
    title: 'Substack Email',
    description:
      'Draft an email-first, long-form Substack piece, then adapt highlights into LinkedIn, Threads, or a note.',
    ctaLabel: 'Start with email',
    route: '/create/substack-email',
    status: 'active',
    icon: Mail,
  },
]

/** Pre-filtered slices used by the Create hub page. Add new slices here when new statuses are promoted. */
export const activeTypes = CONTENT_TYPES.filter((t) => t.status === 'active')
export const comingSoonTypes = CONTENT_TYPES.filter((t) => t.status === 'coming_soon')
