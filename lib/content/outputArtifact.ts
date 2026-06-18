// lib/content/outputArtifact.ts
//
// Studio treats every created thing as a first-class artifact, not only a
// publishable channel post. These helpers give each output a clear human label
// and encode the "image draft" product state (image-first, not a weak empty-body
// text post). Keep this the single source of truth for artifact labeling so the
// list card and the editor never drift.

import type { OutputContent } from '@/types/domain'

/** Minimal shape needed to label an artifact — works for both `Output` and raw rows. */
export interface ArtifactLike {
  contentType?: string | null
  content?: Pick<OutputContent, 'substackFormat'> & Record<string, unknown>
}

/** True for image-only drafts (the Image creator's "Save to Studio" promotion). */
export function isImageDraft(a: ArtifactLike): boolean {
  return a.contentType === 'image'
}

/**
 * An image draft is NOT publishable until it has both caption/body and a target
 * channel. Used to gate publish/schedule controls so we never show dead buttons.
 */
export function isImageDraftPublishable(body: string, channelId: string | null | undefined): boolean {
  return !!body.trim() && !!channelId
}

/**
 * Human label for the artifact, shown on the Studio list card and editor header.
 * Substack Articles and Emails share content_type 'substack-newsletter'; the
 * Article is distinguished by content.substackFormat === 'article' (label only —
 * the internal content_type stays stable for publishing/scheduling).
 */
export function getArtifactLabel(a: ArtifactLike): string {
  const ct = a.contentType ?? ''
  switch (ct) {
    case 'image':
      return 'Image draft'
    case 'substack-newsletter':
      return a.content?.substackFormat === 'article' ? 'Substack Article' : 'Substack Email'
    case 'substack-note':
      return 'Note'
    case 'linkedin':
      return 'LinkedIn'
    case 'instagram':
      return 'Instagram'
    case 'threads':
      return 'Threads'
    case 'blog':
      return 'Blog Post'
    case '':
      return 'Draft'
    default:
      // Humanize an unknown token (e.g. 'authority' → 'Authority') rather than
      // showing a raw slug.
      return ct
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
  }
}
