import { createServiceClient } from '@/lib/supabase/service'

// Each function encapsulates a single activation milestone query.
// Keep completion signals here so the welcome page stays stable
// if the underlying criteria evolve.

export async function isBrandConfigured(workspaceId: string): Promise<boolean> {
  // Brand is "configured" when the user has named their brand or uploaded a logo.
  // A row can exist with all defaults immediately after workspace creation, so
  // row existence alone is not enough.
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('brand_profiles')
    .select('brand_name, logo_url, tone_traits')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!data) return false
  return (
    data.brand_name != null ||
    data.logo_url != null ||
    (Array.isArray(data.tone_traits) && data.tone_traits.length > 0)
  )
}

export async function isPublishingConfigured(workspaceId: string): Promise<boolean> {
  // At least one social or owned channel has been connected.
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('channels')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  return (count ?? 0) > 0
}

export async function isSignalsConfigured(workspaceId: string): Promise<boolean> {
  // Feed settings row exists — user has completed the signal feed setup flow.
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspace_feed_settings')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  return data != null
}

export async function isFirstCaptureDone(workspaceId: string): Promise<boolean> {
  // User has captured at least one idea.
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('captures')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  return (count ?? 0) > 0
}

export interface ActivationStatus {
  brand: boolean
  publishing: boolean
  signals: boolean
  capture: boolean
  completedSteps: number
  totalSteps: number
}

export async function getActivationStatus(workspaceId: string): Promise<ActivationStatus> {
  const [brand, publishing, signals, capture] = await Promise.all([
    isBrandConfigured(workspaceId),
    isPublishingConfigured(workspaceId),
    isSignalsConfigured(workspaceId),
    isFirstCaptureDone(workspaceId),
  ])

  const completedSteps = [brand, publishing, signals, capture].filter(Boolean).length

  return { brand, publishing, signals, capture, completedSteps, totalSteps: 4 }
}
