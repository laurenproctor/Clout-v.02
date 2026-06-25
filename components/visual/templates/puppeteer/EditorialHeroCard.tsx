// components/visual/templates/puppeteer/EditorialHeroCard.tsx
// Full-document React component for Puppeteer rendering.
// Rendered via ReactDOMServer.renderToStaticMarkup() — full CSS allowed (no Satori constraints).
// Layout: full-bleed background. Gradient legibility zone bottom-left. Logo top-right.

import type { BrandTokens } from '@/lib/visual/types/template'
import { EDITORIAL_HERO, fitHeadlineSize } from '@/lib/visual/tokens/editorial'
import { fontFaceRule } from './fontFace'

const TEXT_SHADOW: Record<string, string> = {
  light:  '0 1px 3px rgba(0,0,0,0.20)',
  medium: '0 2px 8px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.20)',
  strong: '0 3px 16px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
}

interface EditorialHeroCardProps {
  headline: string
  subtext?: string
  authorCredit?: string
  backgroundUrl?: string
  logoUrl?: string
  brand: BrandTokens
  fontHeadingUrl?: string
  fontBodyUrl?: string
  width: number
  height: number
  overlayOpacity?: number
  textShadow?: 'none' | 'light' | 'medium' | 'strong'
}

export function EditorialHeroCard({
  headline,
  subtext,
  authorCredit,
  backgroundUrl,
  logoUrl,
  brand,
  fontHeadingUrl,
  fontBodyUrl,
  width,
  height,
  overlayOpacity,
  textShadow,
}: EditorialHeroCardProps) {
  const pad = Math.max(EDITORIAL_HERO.paddingFloor, Math.round(Math.min(width, height) * EDITORIAL_HERO.paddingRatio))
  const logoHeight = Math.round(Math.min(width, height) * 0.07)
  const logoWidth = Math.round(logoHeight * 3.5)
  const textZoneW = Math.round(width * 0.58)
  const textZoneH = Math.round(height * EDITORIAL_HERO.textZoneHeightRatio)
  // Solid-color cards have no photo on the right — use wider text zone
  const maxTextW  = Math.round(width * (backgroundUrl ? EDITORIAL_HERO.textWidthRatio : EDITORIAL_HERO.textWidthRatioSolid))
  const availableH = textZoneH - 2 * pad
  const headlineSize = headline
    ? fitHeadlineSize({ headline, subtext, availableHeight: availableH, availableWidth: maxTextW })
    : Math.round(Math.min(width, height) * 0.075)
  const bodySize = Math.max(28, Math.round(Math.min(width, height) * 0.026))
  const labelSize = Math.round(Math.min(width, height) * 0.018)

  const css = `
    ${fontFaceRule(brand.fontHeading, fontHeadingUrl)}
    ${fontFaceRule(brand.fontBody, fontBodyUrl)}

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
    }

    .root {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      background: ${brand.surface};
      overflow: hidden;
    }

    .bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .gradient-panel {
      position: absolute;
      bottom: 0;
      left: 0;
      width: ${textZoneW}px;
      height: ${textZoneH}px;
      background: radial-gradient(ellipse 120% 100% at 0% 100%, ${brand.overlay} 0%, ${brand.overlay}80 45%, rgba(0,0,0,0) 100%);
      opacity: ${overlayOpacity ?? 1};
    }

    .logo {
      position: absolute;
      top: ${pad}px;
      right: ${pad}px;
      width: ${logoWidth}px;
      height: ${logoHeight}px;
      object-fit: contain;
      object-position: right center;
    }

    .text-block {
      position: absolute;
      bottom: ${pad}px;
      left: ${pad}px;
      max-width: ${maxTextW}px;
      max-height: ${availableH}px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    h2 {
      font-family: ${JSON.stringify(brand.fontHeading)}, Georgia, serif;
      font-size: ${headlineSize}px;
      font-weight: 700;
      color: ${brand.onSurface};
      line-height: 1.05;
      letter-spacing: -0.02em;
      ${TEXT_SHADOW[textShadow ?? ''] ? `text-shadow: ${TEXT_SHADOW[textShadow!]};` : ''}
    }

    .subtext {
      font-family: ${JSON.stringify(brand.fontBody)}, system-ui, sans-serif;
      font-size: ${bodySize}px;
      font-weight: 400;
      color: ${brand.onSurface};
      opacity: 0.78;
      line-height: 1.6;
      ${TEXT_SHADOW[textShadow ?? ''] ? `text-shadow: ${TEXT_SHADOW[textShadow!]};` : ''}
    }

    .credit {
      font-family: ${JSON.stringify(brand.fontBody)}, system-ui, sans-serif;
      font-size: ${labelSize}px;
      font-weight: 500;
      color: ${brand.accent};
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <div className="root">
          {backgroundUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bg" src={backgroundUrl} alt="" />
          )}
          {backgroundUrl && <div className="gradient-panel" />}

          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logo" src={logoUrl} alt="" />
          )}

          <div className="text-block">
            {headline && <h2>{headline}</h2>}
            {subtext && <p className="subtext">{subtext}</p>}
            {authorCredit && <span className="credit">{authorCredit}</span>}
          </div>
        </div>
      </body>
    </html>
  )
}
