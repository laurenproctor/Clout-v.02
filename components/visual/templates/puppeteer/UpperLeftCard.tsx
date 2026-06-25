// components/visual/templates/puppeteer/UpperLeftCard.tsx
// Full-document React component for Puppeteer rendering.
// Layout: text upper-left quadrant (top 52% × left 42%), subject lower-right. Logo bottom-right.

import type { BrandTokens } from '@/lib/visual/types/template'
import { SAFE_ZONE } from '@/lib/visual/tokens/spacing'
import { fitHeadlineSize } from '@/lib/visual/tokens/editorial'
import { fontFaceRule } from './fontFace'

const TEXT_SHADOW: Record<string, string> = {
  light:  '0 1px 3px rgba(0,0,0,0.20)',
  medium: '0 2px 8px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.20)',
  strong: '0 3px 16px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
}

interface UpperLeftCardProps {
  headline: string
  subtext?: string
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

export function UpperLeftCard({
  headline,
  subtext,
  backgroundUrl,
  logoUrl,
  brand,
  fontHeadingUrl,
  fontBodyUrl,
  width,
  height,
  overlayOpacity,
  textShadow,
}: UpperLeftCardProps) {
  const pad = Math.max(SAFE_ZONE.headlineFloor, Math.round(Math.min(width, height) * SAFE_ZONE.headlineRatio))
  const logoHeight = Math.round(Math.min(width, height) * 0.07)
  const logoWidth = Math.round(logoHeight * 3.5)
  const textZoneW = Math.round(width * 0.42)
  const textZoneH = Math.round(height * 0.52)
  const maxTextW = Math.round(textZoneW - pad * 1.5)
  const headlineSize = headline
    ? fitHeadlineSize({ headline, subtext, availableHeight: textZoneH - pad * 2, availableWidth: maxTextW })
    : Math.round(Math.min(width, height) * 0.075)
  const bodySize = Math.max(28, Math.round(Math.min(width, height) * 0.026))

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
      top: 0;
      left: 0;
      width: ${textZoneW}px;
      height: ${textZoneH}px;
      background: radial-gradient(ellipse 120% 120% at 0% 0%, ${brand.overlay} 0%, ${brand.overlay}80 45%, rgba(0,0,0,0) 100%);
      opacity: ${overlayOpacity ?? 1};
    }

    .logo {
      position: absolute;
      bottom: ${pad}px;
      right: ${pad}px;
      width: ${logoWidth}px;
      height: ${logoHeight}px;
      object-fit: contain;
      object-position: right center;
    }

    .text-block {
      position: absolute;
      top: ${pad}px;
      left: ${pad}px;
      max-width: ${maxTextW}px;
      max-height: ${textZoneH - pad * 2}px;
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
  `

  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element -- standalone HTML document rendered to PNG via Puppeteer, not a Next.js page */}
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
          </div>
        </div>
      </body>
    </html>
  )
}
