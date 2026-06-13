'use client'

import * as React from 'react'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  ThumbsUp,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import type { PreviewDensity } from '../core/types'

/**
 * Platform-representative reaction/action row. Icons are decorative line icons
 * (lucide) — we never show fabricated engagement counts. Hidden entirely in
 * mini density (a thumbnail shouldn't render a scaled-down action row).
 */

export type ActionKind =
  | 'like'
  | 'thumbsup'
  | 'comment'
  | 'repost'
  | 'send'
  | 'share'
  | 'save'

const ICONS: Record<ActionKind, LucideIcon> = {
  like: Heart,
  thumbsup: ThumbsUp,
  comment: MessageCircle,
  repost: Repeat2,
  send: Send,
  share: Share2,
  save: Bookmark,
}

const LABELS: Partial<Record<ActionKind, string>> = {
  like: 'Like',
  thumbsup: 'Like',
  comment: 'Comment',
  repost: 'Repost',
  send: 'Send',
  share: 'Share',
}

interface PreviewActionBarProps {
  actions: ActionKind[]
  density: PreviewDensity
  color: string
  /** Show text labels next to icons (LinkedIn/Facebook style). */
  withLabels?: boolean
  iconSize?: number
  /** Distribute actions across the row instead of left-aligned (X/IG style). */
  spread?: boolean
  /** Optional trailing element pinned to the right (e.g. char counter). */
  trailing?: React.ReactNode
  borderTop?: string
}

export function PreviewActionBar({
  actions,
  density,
  color,
  withLabels = false,
  iconSize = 18,
  spread = false,
  trailing,
  borderTop,
}: PreviewActionBarProps) {
  if (density === 'mini') return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: spread ? 'space-between' : 'flex-start',
        gap: spread ? 0 : withLabels ? 4 : 20,
        paddingTop: borderTop ? 8 : 0,
        marginTop: borderTop ? 4 : 0,
        borderTop: borderTop ?? 'none',
        color,
      }}
    >
      {actions.map((kind) => {
        const Icon = ICONS[kind]
        return (
          <span
            key={kind}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flex: spread ? '1 1 0' : '0 0 auto',
              justifyContent: spread ? 'center' : 'flex-start',
              fontSize: 13,
              fontWeight: withLabels ? 600 : 400,
            }}
          >
            <Icon size={iconSize} aria-hidden="true" strokeWidth={1.8} />
            {withLabels && LABELS[kind] && <span>{LABELS[kind]}</span>}
          </span>
        )
      })}
      {trailing != null && (
        <span style={{ marginLeft: spread ? 0 : 'auto' }}>{trailing}</span>
      )}
    </div>
  )
}
