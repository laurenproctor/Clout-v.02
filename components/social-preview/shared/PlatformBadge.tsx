'use client'

import type { PreviewPlatform } from '../core/types'
import { BrandGlyph } from '../brand-icons'

/**
 * Small platform brand mark for a preview's corner/header. Decorative only.
 */

interface PlatformBadgeProps {
  platform: PreviewPlatform
  size?: number
  color?: string
  className?: string
}

export function PlatformBadge({ platform, size = 18, color, className }: PlatformBadgeProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <BrandGlyph platform={platform} size={size} color={color} />
    </span>
  )
}
