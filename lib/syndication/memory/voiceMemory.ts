import type { Platform } from '../types/intelligence'

// Stub: defines the interface for future platform voice continuity.
// Generation is currently stateless; this will be wired in once analytics
// data exists to derive voice patterns from approved outputs.
export interface PlatformVoiceMemory {
  platform: Platform
  workspaceId: string
  commonOpeners: string[]
  averagePostLength: number
  dominantEmotionalRegister: string
  ctaFrequency: number        // 0–1: how often CTAs appear in approved content
  recurringThemes: string[]
}

export async function getVoiceMemory(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub signature, params used once implemented
  _workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub signature, params used once implemented
  _platform: Platform,
): Promise<PlatformVoiceMemory | null> {
  return null
}
