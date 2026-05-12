// components/visual/templates/EditorialHero.tsx
// Satori-compatible template: inline styles only, no className, no CSS transforms.
// Reference feel: A24 poster, Linear launch graphics.
//
// Layout: full-bleed background. Text block anchored bottom-left.
// AI owns the background. React owns every pixel of typography and overlay.

import type { EditorialHeroProps, BrandTokens } from '@/lib/visual/types/template'
import { SCALE, WEIGHT, LEADING } from '@/lib/visual/tokens/scale'

interface EditorialHeroRenderProps extends EditorialHeroProps {
  brand: BrandTokens
  width: number
  height: number
}

export function EditorialHero({
  headline,
  subtext,
  authorCredit,
  backgroundUrl,
  brand,
  width,
  height,
}: EditorialHeroRenderProps) {
  const textZoneWidth  = Math.round(width * 0.58)
  const textZoneHeight = Math.round(height * 0.52)
  const padding = Math.round(Math.min(width, height) * 0.053)   // ~64px at 1200

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        background: brand.surface,
        overflow: 'hidden',
      }}
    >
      {/* Full-bleed background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
        }}
      />

      {/* Gradient panel — creates legibility zone bottom-left.
          AI is responsible for the background mood.
          This gradient is the identity boundary. */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${textZoneWidth}px`,
          height: `${textZoneHeight}px`,
          background: `linear-gradient(135deg, ${brand.overlay} 0%, rgba(0,0,0,0) 100%)`,
          display: 'flex',
        }}
      />

      {/* Text block — anchored bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: `${padding}px`,
          left: `${padding}px`,
          maxWidth: `${Math.round(width * 0.54)}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {headline && (
          <span
            style={{
              fontFamily: brand.fontHeading,
              fontSize: `${SCALE.headline}px`,
              fontWeight: WEIGHT.bold,
              color: brand.onSurface,
              lineHeight: LEADING.headline,
              letterSpacing: '-0.02em',
              // Two-line max enforced by truncation, not reflowing
            }}
          >
            {headline}
          </span>
        )}

        {subtext && (
          <span
            style={{
              fontFamily: brand.fontBody,
              fontSize: `${SCALE.body}px`,
              fontWeight: WEIGHT.regular,
              color: brand.onSurface,
              opacity: 0.78,
              lineHeight: LEADING.body,
            }}
          >
            {subtext}
          </span>
        )}

        {authorCredit && (
          <span
            style={{
              fontFamily: brand.fontBody,
              fontSize: `${SCALE.label}px`,
              fontWeight: WEIGHT.medium,
              color: brand.accent,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {authorCredit}
          </span>
        )}
      </div>
    </div>
  )
}
