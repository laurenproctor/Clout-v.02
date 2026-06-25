import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { pickLinkedInLastSettings } from '@/lib/linkedin/create-settings'
import type { LinkedInGenerationRequest } from '@/lib/linkedin/types'

/**
 * Persist a workspace's last-used LinkedIn create settings so the create flow can pre-fill
 * them next time. Best-effort: never throws — preference persistence must never fail
 * generation. Mirrors the pattern in lib/audiences.ts (saveCustomAudience).
 */
export async function saveLinkedInLastSettings(
  workspaceId: string,
  request: Partial<LinkedInGenerationRequest>,
): Promise<void> {
  const settings = pickLinkedInLastSettings(request)
  if (Object.keys(settings).length === 0) return

  const supabase = createServiceClient()
  await supabase
    .from('workspaces')
    .update({ linkedin_last_create_settings: settings })
    .eq('id', workspaceId)
}
