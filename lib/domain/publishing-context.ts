import { createServiceClient } from '@/lib/supabase/service'
import { UTMConfig, UTMTemplateSettings, DEFAULT_UTM_TEMPLATES } from '@/lib/distribution/platform-registry'

type WorkspacePublishingContext = {
  utmSettings:  Record<string, UTMConfig>
  utmTemplates: UTMTemplateSettings
}

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

  const raw = (data?.utm_settings ?? {}) as Record<string, unknown>
  const { _templates, ...platformSettings } = raw

  const ctx: WorkspacePublishingContext = {
    utmSettings:  platformSettings as Record<string, UTMConfig>,
    utmTemplates: (_templates as UTMTemplateSettings | undefined) ?? DEFAULT_UTM_TEMPLATES,
  }
  contextCache.set(workspaceId, ctx)
  return ctx
}
