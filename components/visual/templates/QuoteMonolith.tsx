// components/visual/templates/QuoteMonolith.tsx
// Satori-compatible template: inline styles only, no className, no CSS transforms.
// Reference feel: typographic editorial layouts, poetry publications.
//
// Layout: centered. Large quote fills 60% of vertical space.
// Works with solid brand color or minimal textured background.

import type { QuoteMonolithProps, BrandTokens } from '@/lib/visual/types/template'
import { SCALE, WEIGHT, LEADING } from '@/lib/visual/tokens/scale'
import { SAFE_ZONE } from '@/lib/visual/tokens/spacing'

interface QuoteMonolithRenderProps extends QuoteMonolithProps {
  brand: BrandTokens
  width: number
  height: number
}

export function QuoteMonolith({
  quote,
  attribution,
  backgroundUrl,
  brand,
  width,
  height,
}: QuoteMonolithRenderProps) {
  const horizontalPad = Math.max(SAFE_ZONE.headlineFloor, Math.round(width * SAFE_ZONE.headlineRatio))
  const verticalPad   = Math.max(SAFE_ZONE.headlineFloor, Math.round(height * SAFE_ZONE.headlineRatio))

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
      {/* Background — optional textured or abstract image */}
      {backgroundUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={backgroundUrl}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: width,
            height: height,
            objectFit: 'cover',
            opacity: 0.18,   // muted — background is texture, not subject
          }}
        />
      )}

      {/* Full overlay for text legibility on background */}
      {backgroundUrl && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: `radial-gradient(ellipse 90% 80% at 50% 50%, ${brand.surface}CC 0%, ${brand.surface}99 60%, rgba(0,0,0,0) 100%)`,
            display: 'flex',
          }}
        />
      )}

      {/* Centered text block */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          paddingLeft:  `${horizontalPad}px`,
          paddingRight: `${horizontalPad}px`,
          paddingTop:   `${verticalPad}px`,
          paddingBottom:`${verticalPad}px`,
          maxWidth: `${width - horizontalPad * 2}px`,
        }}
      >
        {/* Opening quotation mark */}
        <span
          style={{
            fontFamily:  brand.fontHeading,
            fontSize:    `${SCALE.display}px`,
            fontWeight:  WEIGHT.light,
            color:       brand.accent,
            lineHeight:  0.7,
            opacity:     0.5,
            alignSelf:   'flex-start',
          }}
        >
          &ldquo;
        </span>

        <span
          style={{
            fontFamily:  brand.fontHeading,
            fontSize:    `${SCALE.title}px`,
            fontWeight:  WEIGHT.light,
            color:       brand.onSurface,
            lineHeight:  LEADING.title,
            textAlign:   'center',
          }}
        >
          {quote}
        </span>

        {attribution && (
          <span
            style={{
              fontFamily:    brand.fontBody,
              fontSize:      `${SCALE.caption}px`,
              fontWeight:    WEIGHT.medium,
              color:         brand.onSurface,
              opacity:       0.55,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {attribution}
          </span>
        )}
      </div>
    </div>
  )
}
