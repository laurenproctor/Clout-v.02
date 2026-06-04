import { createServiceClient } from '@/lib/supabase/service'
import { UTMConfig, UTMTemplateSettings, DEFAULT_UTM_TEMPLATES } from '@/lib/distribution/platform-registry'

export type WorkspacePublishingContext = {
  utmSettings:  Record<string, UTMConfig>
  utmTemplates: UTMTemplateSettings
}

const TTL_MS = 5 * 60 * 1000 // 5 minutes

type CacheEntry = {
  value:     WorkspacePublishingContext
  expiresAt: number
}

const contextCache = new Map<string, CacheEntry>()

async function fetchWorkspaceUTMContext(workspaceId: string): Promise<WorkspacePublishingContext> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspace_distribution_settings')
    .select('utm_settings')
    .eq('workspace_id', workspaceId)
    .single()

  const raw = (data?.utm_settings ?? {}) as Record<string, unknown>
  const { _templates, ...platformSettings } = raw

  return {
    utmSettings:  platformSettings as Record<string, UTMConfig>,
    utmTemplates: (_templates as UTMTemplateSettings | undefined) ?? DEFAULT_UTM_TEMPLATES,
  }
}

export async function loadUTMContext(workspaceId: string): Promise<WorkspacePublishingContext> {
  const entry = contextCache.get(workspaceId)
  if (entry && entry.expiresAt > Date.now()) return entry.value

  const value = await fetchWorkspaceUTMContext(workspaceId)
  contextCache.set(workspaceId, { value, expiresAt: Date.now() + TTL_MS })
  return value
}

// Kept for backwards compatibility — delegates to loadUTMContext.
export async function buildWorkspacePublishingContext(
  workspaceId: string
): Promise<WorkspacePublishingContext> {
  return loadUTMContext(workspaceId)
}
