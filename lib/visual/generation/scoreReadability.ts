import sharp from 'sharp'

export type ReadabilityRating = 'excellent' | 'good' | 'fair' | 'poor'

export interface LocalReadabilityScore {
  overall:     number
  brightness:  number
  contrast:    number
  edgeDensity: number
  rating:      ReadabilityRating
}

const ZONE_CROPS: Record<string, (w: number, h: number) => { left: number; top: number; width: number; height: number }> = {
  'bottom-left': (w, h) => ({ left: 0,                    top: Math.round(h * 0.35), width: Math.round(w * 0.45), height: Math.round(h * 0.65) }),
  'right':       (w, h) => ({ left: Math.round(w * 0.58), top: 0,                   width: Math.round(w * 0.42), height: h }),
  'upper-left':  (w, h) => ({ left: 0,                    top: 0,                   width: Math.round(w * 0.45), height: Math.round(h * 0.52) }),
  'center':      (w, h) => ({ left: Math.round(w * 0.15), top: Math.round(h * 0.20), width: Math.round(w * 0.70), height: Math.round(h * 0.60) }),
}

export async function scoreReadabilityLocal(
  imageBuffer: Buffer,
  textZone: string,
): Promise<LocalReadabilityScore> {
  const meta = await sharp(imageBuffer).metadata()
  const w = meta.width ?? 1024
  const h = meta.height ?? 1024

  const crop = ZONE_CROPS[textZone] ?? ZONE_CROPS['bottom-left']
  const { data, info } = await sharp(imageBuffer)
    .extract(crop(w, h))
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data.buffer)
  const n = pixels.length
  if (n === 0) return { overall: 0.5, brightness: 0.5, contrast: 0.5, edgeDensity: 0.5, rating: 'good' }

  let sum = 0
  for (let i = 0; i < n; i++) sum += pixels[i]
  const mean = sum / n
  const brightness = mean / 255

  let variance = 0
  for (let i = 0; i < n; i++) variance += (pixels[i] - mean) ** 2
  const stdDev = Math.sqrt(variance / n)
  const contrast = Math.min(stdDev / 80, 1)

  const W = info.width
  let edgeCount = 0
  for (let i = 0; i < n; i++) {
    const right = i + 1 < n && i % W !== W - 1 ? Math.abs(pixels[i] - pixels[i + 1]) : 0
    const below = i + W < n ? Math.abs(pixels[i] - pixels[i + W]) : 0
    if (right > 30 || below > 30) edgeCount++
  }
  const edgeDensity = edgeCount / n

  // Ideal ~35% brightness — clean zone with moderate contrast
  const brightnessScore = 1 - Math.abs(brightness - 0.35) * 1.5
  const overall = Math.max(0, Math.min(1,
    brightnessScore * 0.3 +
    contrast * 0.2 +
    (1 - edgeDensity) * 0.5
  ))

  const rating: ReadabilityRating =
    overall >= 0.75 ? 'excellent' :
    overall >= 0.50 ? 'good' :
    overall >= 0.25 ? 'fair' : 'poor'

  return { overall, brightness, contrast, edgeDensity, rating }
}
