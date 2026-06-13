/**
 * Mode → visual scale + content density.
 *
 * `mode` controls visual scale only. `density` controls content behavior
 * (mini strips chrome and hard-clamps text). Each platform is rendered ONCE at
 * its native base width; PreviewFrame applies the scale.
 */

import type { PreviewDensity, PreviewMode } from './types'

export interface ModeConfig {
  scale: number
  density: PreviewDensity
}

export const PREVIEW_MODE_SCALE: Record<PreviewMode, ModeConfig> = {
  full:    { scale: 1,    density: 'standard' },
  compact: { scale: 0.62, density: 'standard' },
  mini:    { scale: 0.28, density: 'mini' },
}

export function getModeConfig(mode: PreviewMode): ModeConfig {
  return PREVIEW_MODE_SCALE[mode] ?? PREVIEW_MODE_SCALE.full
}
