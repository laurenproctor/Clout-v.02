'use client'

import { tokens } from '@/lib/feed/tokens'
import type { TimingClassification } from '@/types/feed'

interface BadgeTimingProps {
  classification: TimingClassification
}

export function BadgeTiming({ classification }: BadgeTimingProps) {
  const isTimeSensitive = classification === 'publish_now'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        backgroundColor: isTimeSensitive
          ? tokens.colors.timeSensitiveBadgeBg
          : tokens.colors.foundationContentBadgeBg,
        color: isTimeSensitive
          ? tokens.colors.timeSensitiveBadgeText
          : tokens.colors.foundationContentBadgeText,
      }}
    >
      {isTimeSensitive ? 'Publish Now' : 'Evergreen'}
    </span>
  )
}
