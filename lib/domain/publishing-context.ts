import { createServiceClient } from '@/lib/supabase/service'
import { UTMConfig } from '@/lib/distribution/platform-registry'

type WorkspacePublishingContext = {
  utmSettings: Record<string, UTMConfig>
}

// Request-level memoization — avoids repeated reads when publishing fans out across channels
const contextCache = new Map<string, WorkspacePublishingContext>()

export async function buildWorkspacePublishingContext(
  workspaceId: string
): Promise<WorkspacePublishingContext> {
  if (contextCache.has(workspaceId)) return contextCache.get(workspaceId)!

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspace_distribution_settings')
    .select('utm_settings')
    .eq('workspace_id', workspaceId)
    .single()

  const ctx: WorkspacePublishingContext = {
    utmSettings: (data?.utm_settings as Record<string, UTMConfig>) ?? {},
  }
  contextCache.set(workspaceId, ctx)
  return ctx
}
