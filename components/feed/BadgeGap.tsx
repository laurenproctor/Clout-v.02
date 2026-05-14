'use client'

import { tokens } from '@/lib/feed/tokens'

interface BadgeGapProps {
  status: 'gap' | 'covered'
}

export function BadgeGap({ status }: BadgeGapProps) {
  const isGap = status === 'gap'
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
        backgroundColor: isGap ? tokens.colors.unclaimedBadgeBg : tokens.colors.inCirculationBadgeBg,
        color: isGap ? tokens.colors.unclaimedBadgeText : tokens.colors.inCirculationBadgeText,
      }}
    >
      {isGap ? 'Unclaimed' : 'In circulation'}
    </span>
  )
}
