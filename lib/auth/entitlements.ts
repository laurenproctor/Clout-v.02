import { createClient } from '@/lib/supabase/server'

interface Entitlements {
  captures_per_month: number
  generations_per_month: number
  lenses_max: number
  members_max: number
  voice_minutes_per_month: number
  operator_access: boolean
}

const FREE_ENTITLEMENTS: Entitlements = {
  captures_per_month: 10,
  generations_per_month: 20,
  lenses_max: 3,
  members_max: 1,
  voice_minutes_per_month: 30,
  operator_access: false,
}

export async function getEntitlements(workspaceId: string): Promise<Entitlements> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('entitlements')
    .eq('workspace_id', workspaceId)
    .single()

  if (!data?.entitlements) return FREE_ENTITLEMENTS
  return { ...FREE_ENTITLEMENTS, ...(data.entitlements as Partial<Entitlements>) }
}

export async function checkCaptureLimit(workspaceId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = await createClient()
  const entitlements = await getEntitlements(workspaceId)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count } = await supabase
    .from('captures')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', monthStart)
    .is('deleted_at', null)

  const used = count ?? 0
  const limit = entitlements.captures_per_month

  return { allowed: used < limit, used, limit }
}

export async function checkGenerationLimit(workspaceId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = await createClient()
  const entitlements = await getEntitlements(workspaceId)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count } = await supabase
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', monthStart)

  const used = count ?? 0
  const limit = entitlements.generations_per_month

  return { allowed: used < limit, used, limit }
}
