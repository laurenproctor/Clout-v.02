// lib/visual/brand/buildBrandTokens.ts
// Maps raw brand_profile hex values + BrandSemanticProfile → BrandTokens for template rendering.
// BrandTokens are the only color/font values templates are allowed to reference.

import type { BrandSemanticProfile } from '../types/visual'
import type { BrandTokens } from '../types/template'

interface RawBrandColors {
  primaryColor: string    // hex
  secondaryColor: string  // hex
  accentColor: string     // hex
  fontHeading: string
  fontBody: string
  styleTrait_borderRadius?: string  // from brand_profiles.style_traits.border_radius
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

function perceivedLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0.5
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Pick a readable text color (near-black or near-white) for a given background hex.
function onColor(backgroundHex: string): string {
  return perceivedLuminance(backgroundHex) > 0.5 ? '#111111' : '#F8F8F8'
}

function resolveBorderRadius(
  styleTrait?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for profile-aware radius resolution; called positionally
  _semanticProfile?: BrandSemanticProfile
): BrandTokens['borderRadius'] {
  if (!styleTrait) return 'balanced'
  const t = styleTrait.toLowerCase()
  if (t === 'none' || t === 'sharp') return 'none'
  if (t === 'subtle' || t === 'slight') return 'subtle'
  return 'balanced'
}

export function buildBrandTokens(
  raw: RawBrandColors,
  semanticProfile: BrandSemanticProfile,
  tokenOverrides?: Record<string, unknown>
): BrandTokens {
  const surface    = raw.primaryColor ?? '#1A1A1A'
  const accent     = raw.accentColor ?? '#D4A574'
  const onSurface  = onColor(surface)
  const overlayAlpha = typeof tokenOverrides?.overlay_opacity === 'number'
    ? tokenOverrides.overlay_opacity as number
    : 0.65

  return {
    surface,
    onSurface,
    accent,
    overlay:     hexToRgba(surface, overlayAlpha),
    fontHeading: raw.fontHeading || 'system-ui',
    fontBody:    raw.fontBody    || 'system-ui',
    borderRadius: resolveBorderRadius(raw.styleTrait_borderRadius, semanticProfile),
  }
}
