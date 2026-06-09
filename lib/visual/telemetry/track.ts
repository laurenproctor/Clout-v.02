// lib/visual/telemetry/track.ts
// Records image generation outcomes for quality analysis and feedback loop.
// Call via after() so tracking never adds latency to the generation response.

import { createClient } from '@/lib/supabase/server'
import type { LogoCorner } from '../types/template'

export interface GenerationEvent {
  imageId: string
  workspaceId: string

  // Internal quality signals
  templateId: string | null
  qualityScore: number | null
  openZone: string | null
  openZoneConfidence: number | null
  logoVisibilityScore: number | null
  templateOverrideUsed: boolean   // did confidence gate fire and change the template?
  logoRepositioned: boolean       // did logo move from template default?
  qualityGateTriggered: boolean   // did the rejection gate fire?
  regenerationRequested: boolean
  rejectionReason: string | null

  // User behavior signals — written separately via PATCH /api/visual/events/:id
  // High qualityScore + userRegenerated=true → model/preference misalignment
  // Low qualityScore + userPublished=true → image worked despite lower score
  userDownloaded?: boolean
  userPublished?: boolean
  userRegenerated?: boolean
  userDiscarded?: boolean
}

export async function trackGeneration(event: GenerationEvent): Promise<void> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('visual_generation_events').insert({
      image_id:               event.imageId,
      workspace_id:           event.workspaceId,
      template_id:            event.templateId,
      quality_score:          event.qualityScore,
      open_zone:              event.openZone,
      open_zone_confidence:   event.openZoneConfidence,
      logo_visibility_score:  event.logoVisibilityScore,
      template_override_used: event.templateOverrideUsed,
      logo_repositioned:      event.logoRepositioned,
      quality_gate_triggered: event.qualityGateTriggered,
      regeneration_requested: event.regenerationRequested,
      rejection_reason:       event.rejectionReason,
    })
  } catch (err) {
    // Telemetry failure must never affect generation — swallow silently
    console.warn('[visual/telemetry] trackGeneration failed:', err)
  }
}

export async function updateGenerationBehavior(
  imageId: string,
  workspaceId: string,
  behavior: Pick<GenerationEvent, 'userDownloaded' | 'userPublished' | 'userRegenerated' | 'userDiscarded'>
): Promise<void> {
  try {
    const supabase = await createClient()
    const updates: Record<string, boolean> = {}
    if (behavior.userDownloaded != null) updates.user_downloaded = behavior.userDownloaded
    if (behavior.userPublished  != null) updates.user_published  = behavior.userPublished
    if (behavior.userRegenerated != null) updates.user_regenerated = behavior.userRegenerated
    if (behavior.userDiscarded  != null) updates.user_discarded  = behavior.userDiscarded

    if (Object.keys(updates).length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('visual_generation_events')
      .update(updates)
      .eq('image_id', imageId)
      .eq('workspace_id', workspaceId)
  } catch (err) {
    console.warn('[visual/telemetry] updateGenerationBehavior failed:', err)
  }
}

// Convenience: resolve LogoCorner to a boolean for the logoRepositioned telemetry field.
// A corner is "repositioned" when the vision model selected a non-default corner.
export function wasLogoRepositioned(
  selectedCorner: LogoCorner | null,
  defaultCorner: LogoCorner
): boolean {
  return selectedCorner != null && selectedCorner !== defaultCorner
}
