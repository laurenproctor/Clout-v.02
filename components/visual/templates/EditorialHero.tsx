// components/visual/templates/EditorialHero.tsx
// Satori-compatible template: inline styles only, no className, no CSS transforms.
// Reference feel: A24 poster, Linear launch graphics.
//
// Layout: full-bleed background. Text block anchored bottom-left.
// AI owns the background. React owns every pixel of typography and overlay.

import type { EditorialHeroProps, BrandTokens } from '@/lib/visual/types/template'
import { SCALE, WEIGHT, LEADING } from '@/lib/visual/tokens/scale'
import { EDITORIAL_HERO, fitHeadlineSize } from '@/lib/visual/tokens/editorial'

const TEXT_SHADOW: Record<string, string> = {
  light:  '0 1px 3px rgba(0,0,0,0.20)',
  medium: '0 2px 8px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.20)',
  strong: '0 3px 16px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
}

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
  logoUrl,
  brand,
  width,
  height,
  overlayOpacity,
  textShadow,
}: EditorialHeroRenderProps) {
  const textZoneWidth  = Math.round(width * 0.58)
  const textZoneHeight = Math.round(height * EDITORIAL_HERO.textZoneHeightRatio)
  const padding    = Math.max(EDITORIAL_HERO.paddingFloor, Math.round(Math.min(width, height) * EDITORIAL_HERO.paddingRatio))
  // Solid-color cards have no photo on the right — use a wider text zone
  const maxWidth   = Math.round(width * (backgroundUrl ? EDITORIAL_HERO.textWidthRatio : EDITORIAL_HERO.textWidthRatioSolid))
  const availableHeight = textZoneHeight - 2 * padding
  const headlineSize = headline
    ? fitHeadlineSize({ headline, subtext, availableHeight, availableWidth: maxWidth })
    : SCALE.headline
  const logoHeight = Math.round(Math.min(width, height) * 0.07) // ~84px at 1200
  const logoWidth  = Math.round(logoHeight * 3.5)               // allow wide logos

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
      {/* Full-bleed background image — omitted for solid-color brand cards */}
      {backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
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
          }}
        />
      )}

      {/* Gradient legibility panel — only needed over a photo background */}
      {backgroundUrl && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: `${textZoneWidth}px`,
            height: `${textZoneHeight}px`,
            background: `radial-gradient(ellipse 120% 100% at 0% 100%, ${brand.overlay} 0%, ${brand.overlay}80 45%, rgba(0,0,0,0) 100%)`,
            opacity: overlayOpacity ?? 1,
            display: 'flex',
          }}
        />
      )}

      {/* Logo — anchored top-right */}
      {logoUrl && (
        <div
          style={{
            position: 'absolute',
            top: `${padding}px`,
            right: `${padding}px`,
            width: `${logoWidth}px`,
            height: `${logoHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            style={{
              width: logoWidth,
              height: logoHeight,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Text block — anchored bottom-left, capped to gradient zone */}
      <div
        style={{
          position: 'absolute',
          bottom: `${padding}px`,
          left: `${padding}px`,
          maxWidth: `${maxWidth}px`,
          maxHeight: `${availableHeight}px`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {headline && (
          <span
            style={{
              fontFamily: brand.fontHeading,
              fontSize: `${headlineSize}px`,
              fontWeight: WEIGHT.bold,
              color: brand.onSurface,
              lineHeight: LEADING.headline,
              letterSpacing: '-0.02em',
              textShadow: TEXT_SHADOW[textShadow ?? ''] ?? undefined,
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
              textShadow: TEXT_SHADOW[textShadow ?? ''] ?? undefined,
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
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {authorCredit}
          </span>
        )}
      </div>
    </div>
  )
}
