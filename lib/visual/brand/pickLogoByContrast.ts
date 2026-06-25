// lib/visual/brand/pickLogoByContrast.ts
// Pick the logo variant that actually CONTRASTS with the background, by measuring
// each candidate's perceived luminance over its opaque pixels — rather than
// trusting the brand's light/dark *tags*, which are ambiguous ("light" = a
// light-colored logo, or a logo for light backgrounds?) and easy to set the wrong
// way round. A dark background wants the lightest logo; a light background wants
// the darkest.

import sharp from 'sharp'

/** Mean perceived luminance (0–1) over opaque pixels, or null if it can't be read. */
async function logoLuminance(url: string): Promise<number | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const { data, info } = await sharp(buf)
      .resize(64, 64, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const ch = info.channels // 4 after ensureAlpha
    let sum = 0
    let weight = 0
    for (let i = 0; i < data.length; i += ch) {
      const a = data[i + 3] / 255
      if (a < 0.1) continue // ignore (near-)transparent pixels — they aren't "the logo"
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255
      sum += lum * a
      weight += a
    }
    return weight > 0 ? sum / weight : null
  } catch {
    return null
  }
}

/**
 * Choose the best-contrasting logo from the candidates.
 * @param urls       candidate logo URLs (any order; falsy/duplicates ignored)
 * @param preferLight true when the background is DARK (we want a light/high-luminance logo)
 * Returns the chosen URL, or the first candidate if none can be measured.
 */
export async function pickLogoByContrast(
  urls: (string | undefined | null)[],
  preferLight: boolean,
): Promise<string | undefined> {
  const candidates = [...new Set(urls.filter((u): u is string => !!u))]
  if (candidates.length <= 1) return candidates[0]

  const scored = await Promise.all(
    candidates.map(async (u) => ({ url: u, lum: await logoLuminance(u) })),
  )
  const measured = scored.filter((s): s is { url: string; lum: number } => s.lum != null)
  if (measured.length === 0) return candidates[0]

  // Dark bg → highest luminance first; light bg → lowest first.
  measured.sort((a, b) => (preferLight ? b.lum - a.lum : a.lum - b.lum))
  return measured[0].url
}
