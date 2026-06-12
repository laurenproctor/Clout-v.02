import { createClient } from '@/lib/supabase/server'
import { isNarrativeGoal } from '@/lib/content/goals'
import type {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
  DomainResult,
  NarrativeGoal,
} from '@/types/domain'

const MIN_PURPOSE_LENGTH = 20

function isValidPurpose(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length >= MIN_PURPOSE_LENGTH
}

function toCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    goal: row.goal as NarrativeGoal,
    purpose: row.purpose as string,
    status: row.status as CampaignStatus,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string | null) ?? null,
  }
}

export async function createCampaign(
  input: CreateCampaignInput
): Promise<DomainResult<Campaign>> {
  if (!input.name?.trim()) {
    return { ok: false, error: 'A campaign name is required', code: 'INVALID_NAME' }
  }
  if (!isNarrativeGoal(input.goal)) {
    return { ok: false, error: 'A valid strategic goal is required', code: 'INVALID_GOAL' }
  }
  if (!isValidPurpose(input.purpose)) {
    return {
      ok: false,
      error: 'Describe what this campaign is meant to accomplish (at least 20 characters)',
      code: 'INVALID_PURPOSE',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy ?? null,
      name: input.name.trim(),
      goal: input.goal,
      purpose: input.purpose.trim(),
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toCampaign(data as Record<string, unknown>) }
}

export async function getCampaign(
  id: string,
  workspaceId: string
): Promise<DomainResult<Campaign>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toCampaign(data as Record<string, unknown>) }
}

export async function listCampaigns(params: {
  workspaceId: string
  status?: CampaignStatus
}): Promise<DomainResult<Campaign[]>> {
  const supabase = await createClient()
  let query = supabase
    .from('campaigns')
    .select()
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toCampaign) }
}

export async function updateCampaign(params: {
  id: string
  workspaceId: string
  updates: UpdateCampaignInput
}): Promise<DomainResult<Campaign>> {
  const { id, workspaceId, updates } = params

  if (updates.name !== undefined && !updates.name.trim()) {
    return { ok: false, error: 'A campaign name is required', code: 'INVALID_NAME' }
  }
  if (updates.goal !== undefined && !isNarrativeGoal(updates.goal)) {
    return { ok: false, error: 'A valid strategic goal is required', code: 'INVALID_GOAL' }
  }
  if (updates.purpose !== undefined && !isValidPurpose(updates.purpose)) {
    return {
      ok: false,
      error: 'Describe what this campaign is meant to accomplish (at least 20 characters)',
      code: 'INVALID_PURPOSE',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.goal !== undefined && { goal: updates.goal }),
      ...(updates.purpose !== undefined && { purpose: updates.purpose.trim() }),
      ...(updates.status !== undefined && { status: updates.status }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toCampaign(data as Record<string, unknown>) }
}

// Archive is a status transition, NOT a soft-delete: archived campaigns stay
// queryable (deleted_at stays null). deleted_at is reserved for future
// destructive deletion behavior.
export async function archiveCampaign(params: {
  id: string
  workspaceId: string
}): Promise<DomainResult<Campaign>> {
  return updateCampaign({
    id: params.id,
    workspaceId: params.workspaceId,
    updates: { status: 'archived' },
  })
}

// DB-pure helper for generation/save routes. Verifies the campaign belongs to
// the workspace and is not archived/deleted before returning context to inject.
// Returns null on any miss so callers can reject cleanly.
export async function getCampaignContext(
  campaignId: string,
  workspaceId: string
): Promise<{ goal: NarrativeGoal; purpose: string } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('goal, purpose, status')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  if (data.status === 'archived') return null
  return { goal: data.goal as NarrativeGoal, purpose: data.purpose as string }
}
