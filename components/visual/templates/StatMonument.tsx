// components/visual/templates/StatMonument.tsx
// Satori-compatible template: inline styles only, no className, no CSS transforms.
// Reference feel: Spotify Wrapped, Bloomberg data journalism.
//
// Layout: large numeral anchored center or upper-center.
// High negative space. Context text below. Optional label above.

import type { StatMonumentProps, BrandTokens } from '@/lib/visual/types/template'
import { SCALE, WEIGHT, LEADING } from '@/lib/visual/tokens/scale'

interface StatMonumentRenderProps extends StatMonumentProps {
  brand: BrandTokens
  width: number
  height: number
}

export function StatMonument({
  statistic,
  context,
  label,
  source,
  backgroundUrl,
  brand,
  width,
  height,
}: StatMonumentRenderProps) {
  const horizontalPad = Math.round(width * 0.067)   // ~80px at 1200
  const verticalPad   = Math.round(height * 0.11)   // ~80px at 720

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: brand.surface,
        overflow: 'hidden',
      }}
    >
      {/* Abstract background — optional */}
      {backgroundUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={backgroundUrl}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.12,
          }}
        />
      )}

      {/* Background wash for contrast */}
      {backgroundUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `${brand.surface}DD`,
            display: 'flex',
          }}
        />
      )}

      {/* Content column — centered */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          paddingLeft:  `${horizontalPad}px`,
          paddingRight: `${horizontalPad}px`,
          paddingTop:   `${verticalPad}px`,
          paddingBottom:`${verticalPad}px`,
          maxWidth: `${width - horizontalPad * 2}px`,
        }}
      >
        {/* Optional label above the stat */}
        {label && (
          <span
            style={{
              fontFamily:    brand.fontBody,
              fontSize:      `${SCALE.label}px`,
              fontWeight:    WEIGHT.medium,
              color:         brand.accent,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
        )}

        {/* The number — this is the whole point */}
        <span
          style={{
            fontFamily:    brand.fontHeading,
            fontSize:      `${SCALE.display}px`,
            fontWeight:    WEIGHT.bold,
            color:         brand.onSurface,
            lineHeight:    LEADING.display,
            letterSpacing: '-0.03em',
          }}
        >
          {statistic}
        </span>

        {/* Context — what the number means */}
        <span
          style={{
            fontFamily: brand.fontBody,
            fontSize:   `${SCALE.subhead}px`,
            fontWeight: WEIGHT.regular,
            color:      brand.onSurface,
            opacity:    0.72,
            lineHeight: LEADING.body,
            textAlign:  'center',
            maxWidth:   `${Math.round(width * 0.65)}px`,
          }}
        >
          {context}
        </span>

        {/* Source citation */}
        {source && (
          <span
            style={{
              fontFamily:    brand.fontBody,
              fontSize:      `${SCALE.label}px`,
              fontWeight:    WEIGHT.regular,
              color:         brand.onSurface,
              opacity:       0.38,
              letterSpacing: '0.04em',
              marginTop:     '8px',
            }}
          >
            {source}
          </span>
        )}
      </div>
    </div>
  )
}
