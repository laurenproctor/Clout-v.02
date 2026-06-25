// components/visual/templates/puppeteer/QuoteCard.tsx
// Full-document React component for Puppeteer rendering.
// Rendered via ReactDOMServer.renderToStaticMarkup() — full CSS allowed (no Satori constraints).
// Quote in <h3>, attribution below, optional logo top-right.

import type { BrandTokens } from '@/lib/visual/types/template'
import { SAFE_ZONE } from '@/lib/visual/tokens/spacing'
import { fontFaceRule } from './fontFace'

interface QuoteCardProps {
  quote: string
  attribution?: string
  backgroundUrl?: string
  logoUrl?: string
  brand: BrandTokens
  // Extended brand fields for CSS @font-face (not in BrandTokens)
  fontHeadingUrl?: string
  fontBodyUrl?: string
  width: number
  height: number
  overlayOpacity?: number
}

export function QuoteCard({
  quote,
  attribution,
  backgroundUrl,
  logoUrl,
  brand,
  fontHeadingUrl,
  fontBodyUrl,
  width,
  height,
  overlayOpacity,
}: QuoteCardProps) {
  const pad = Math.max(SAFE_ZONE.headlineFloor, Math.round(Math.min(width, height) * SAFE_ZONE.headlineRatio))
  const logoSize = Math.round(Math.min(width, height) * 0.07)
  const logoWidth = Math.round(logoSize * 3.5)
  const quoteSize = Math.round(Math.min(width, height) * 0.055)
  const attributionSize = Math.round(Math.min(width, height) * 0.02)
  const decorSize = Math.round(Math.min(width, height) * 0.18)

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
      display: flex;
      align-items: center;
      justify-content: center;
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

    .overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse 90% 80% at 50% 50%,
        ${brand.surface}CC 0%,
        ${brand.surface}99 60%,
        rgba(0,0,0,0) 100%
      );
      opacity: ${overlayOpacity ?? 1};
    }

    .logo {
      position: absolute;
      top: ${pad}px;
      right: ${pad}px;
      width: ${logoWidth}px;
      height: ${logoSize}px;
      object-fit: contain;
      object-position: right center;
    }

    .content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${Math.round(height * 0.03)}px;
      padding: ${pad * 2}px ${pad}px;
      max-width: ${Math.round(width * 0.78)}px;
      text-align: center;
    }

    .decor {
      font-family: ${JSON.stringify(brand.fontHeading)}, Georgia, serif;
      font-size: ${decorSize}px;
      font-weight: 300;
      color: ${brand.accent};
      line-height: 0.7;
      opacity: 0.5;
      align-self: flex-start;
    }

    h3 {
      font-family: ${JSON.stringify(brand.fontHeading)}, Georgia, serif;
      font-size: ${quoteSize}px;
      font-weight: 300;
      color: ${brand.onSurface};
      line-height: 1.3;
      letter-spacing: -0.01em;
    }

    .attribution {
      font-family: ${JSON.stringify(brand.fontBody)}, system-ui, sans-serif;
      font-size: ${attributionSize}px;
      font-weight: 500;
      color: ${brand.accent};
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.9;
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
          {backgroundUrl && <div className="overlay" />}

          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logo" src={logoUrl} alt="" />
          )}

          <div className="content">
            <span className="decor" aria-hidden="true">&ldquo;</span>
            <h3>{quote}</h3>
            {attribution && <p className="attribution">{attribution}</p>}
          </div>
        </div>
      </body>
    </html>
  )
}
