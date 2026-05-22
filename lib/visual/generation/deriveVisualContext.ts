// lib/visual/generation/deriveVisualContext.ts
import type { VisualIntent } from '../types/visual'

export function deriveVisualContext(intent: VisualIntent, brandArchetype?: string): string {
  const parts: string[] = []

  if (brandArchetype) parts.push(`${brandArchetype} visual style`)

  if (intent.compositionStyle) parts.push(intent.compositionStyle)
  if (intent.lightingStyle)    parts.push(intent.lightingStyle)
  if (intent.colorMood)        parts.push(intent.colorMood)

  const densityLabel = intent.visualDensity === 'minimal'  ? 'generous negative space'
                     : intent.visualDensity === 'dense'    ? 'layered composition'
                     : 'balanced composition'
  parts.push(densityLabel)

  if (intent.viewerEmotion) parts.push(`Viewer emotion: ${intent.viewerEmotion}`)

  return parts.filter(Boolean).join('. ') + '.'
}
