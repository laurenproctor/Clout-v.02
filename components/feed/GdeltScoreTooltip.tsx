'use client'

import { useState } from 'react'
import { tokens } from '@/lib/feed/tokens'

const DEFAULT_TOOLTIP =
  'GDELT score is a composite of two signals: coverage volume change in the past 48h (60% weight) and tone intensity — the emotional charge of coverage regardless of direction (40% weight). Scores range 0.00–1.00. Cards above 0.70 receive the Trending badge. Powered by GDELT Cloud.'

interface GdeltScoreTooltipProps {
  score: number | null
  label: string
  tooltipText?: string
}

export function GdeltScoreTooltip({ score, label, tooltipText }: GdeltScoreTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
      <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor, fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor, fontWeight: 600 }}>
        {score !== null ? score.toFixed(2) : '--'}
      </span>
      {score !== null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: tokens.dimensions.gdeltInfoIconSize,
            height: tokens.dimensions.gdeltInfoIconSize,
            borderRadius: '50%',
            border: `1px solid ${tokens.colors.gdeltInfoIconBorder}`,
            fontSize: '9px',
            fontStyle: 'italic',
            fontFamily: 'serif',
            cursor: 'default',
            color: open ? tokens.colors.gdeltInfoIconHover : tokens.colors.gdeltInfoIconBorder,
            transition: 'color 0.1s',
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          i
        </span>
      )}
      {open && score !== null && (
        <span
          style={{
            position: 'absolute',
            bottom: tokens.tooltip.offsetBottom,
            left: '0',
            backgroundColor: tokens.colors.tooltipBackground,
            color: tokens.colors.tooltipText,
            fontSize: tokens.fontSize.tooltip,
            maxWidth: tokens.tooltip.gdeltMaxWidth,
            padding: '6px 8px',
            borderRadius: '4px',
            lineHeight: '1.4',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {tooltipText ?? DEFAULT_TOOLTIP}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '8px',
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `4px solid ${tokens.colors.tooltipBackground}`,
            }}
          />
        </span>
      )}
    </span>
  )
}
