// Shared @font-face builder for the Puppeteer card templates.
// The CSS `format()` hint must match the actual file — a wrong hint lets the browser skip the
// source, so brand fonts (which may be .woff2/.woff/.ttf/.otf — see /api/brand/font) are
// classified from the URL extension rather than always claiming 'woff2'.

const FORMAT_BY_EXT: Record<string, string> = {
  woff2: 'woff2',
  woff:  'woff',
  ttf:   'truetype',
  otf:   'opentype',
}

/** Derive the CSS @font-face `format()` token from a font URL's extension (default woff2). */
export function fontFormatForUrl(url: string): string {
  const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
  return (ext && FORMAT_BY_EXT[ext]) || 'woff2'
}

/** Build an @font-face rule for a brand font, or '' when no URL is available. */
export function fontFaceRule(family: string, url: string | undefined): string {
  if (!url) return ''
  return `
    @font-face {
      font-family: ${JSON.stringify(family)};
      src: url(${JSON.stringify(url)}) format(${JSON.stringify(fontFormatForUrl(url))});
      font-weight: 100 900;
      font-style: normal;
    }
  `
}
