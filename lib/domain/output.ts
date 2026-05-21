import { createClient } from '@/lib/supabase/server'
import type { Output, OutputVersion, OutputContent, OutputStatus, ChannelPlatform, PerformanceSnapshot, DomainResult } from '@/types/domain'
import type { Json } from '@/types/db'

function toOutput(row: Record<string, unknown>): Output {
  const output: Output = {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    generationId: (row.generation_id as string | null) ?? null,
    channelId: row.channel_id as string | null,
    status: row.status as OutputStatus,
    title: row.title as string | null,
    content: row.content as OutputContent,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    providerPostId:  (row.provider_post_id  as string | null) ?? null,
    providerPostUrl: (row.provider_post_url as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    lastPublishError:    (row.last_publish_error as string | null) ?? null,
    generationGroupId:   (row.generation_group_id as string | null) ?? null,
    approvedForWeek:     (row.approved_for_week as boolean) ?? false,
    weekBucket:          (row.week_bucket as string | null) ?? null,
    performanceSnapshot: (row.performance_snapshot as PerformanceSnapshot | null) ?? null,
    narrativeRole: null,
    narrativeArcId: null,
    narrativeArcName: null,
    goal: null,
    funnelStage: null,
    resonancePrediction: null,
    conceptId: null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }

  // Add channel info if present from joined query
  if (row.channels && typeof row.channels === 'object') {
    const channelRow = row.channels as Record<string, unknown>
    output.channels = {
      platform: channelRow.platform as any,
      label: (channelRow.label as string | null) ?? null,
    }
  }

  return output
}

function toOutputVersion(row: Record<string, unknown>): OutputVersion {
  return {
    id: row.id as string,
    outputId: row.output_id as string,
    versionNumber: row.version_number as number,
    content: row.content as OutputContent,
    changeSummary: row.change_summary as string | null,
    editedBy: row.edited_by as string | null,
    createdAt: row.created_at as string,
  }
}

export async function getOutput(outputId: string): Promise<DomainResult<Output>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .select()
    .eq('id', outputId)
    .is('deleted_at', null)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toOutput(data as Record<string, unknown>) }
}

export async function listOutputs(params: {
  workspaceId: string
  status?: OutputStatus
  limit?: number
  offset?: number
}): Promise<DomainResult<Output[]>> {
  const supabase = await createClient()
  let query = supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, published_at, scheduled_at, created_at, updated_at, channels(platform, label)')
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.status) query = query.eq('status', params.status)
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1)
  }

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toOutput) }
}

export async function listOutputsByGenerationId(params: {
  generationId: string
  workspaceId: string
}): Promise<DomainResult<Output[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, published_at, scheduled_at, created_at, updated_at, channels(platform, label)')
    .eq('generation_id', params.generationId)
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(5)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toOutput) }
}

export async function listOutputsByGroupId(params: {
  generationGroupId: string
  workspaceId: string
}): Promise<DomainResult<Output[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, generation_group_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, published_at, scheduled_at, last_publish_error, approved_for_week, week_bucket, performance_snapshot, created_at, updated_at, channels(platform, label)')
    .eq('generation_group_id', params.generationGroupId)
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(6)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toOutput) }
}

export async function updateOutput(params: {
  outputId: string
  content?: OutputContent
  title?: string
  status?: OutputStatus
  approvedBy?: string
  channelId?: string | null
  providerPostId?: string | null
  publishedAt?: string | null
  scheduledAt?: string | null
  lastPublishError?: string | null
}): Promise<DomainResult<Output>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .update({
      ...(params.content && { content: params.content as unknown as Json }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.status && { status: params.status }),
      ...(params.approvedBy && {
        approved_by: params.approvedBy,
        approved_at: new Date().toISOString(),
      }),
      ...(params.channelId !== undefined && { channel_id: params.channelId }),
      ...(params.providerPostId !== undefined && { provider_post_id: params.providerPostId }),
      ...(params.publishedAt !== undefined && { published_at: params.publishedAt }),
      ...(params.scheduledAt !== undefined && { scheduled_at: params.scheduledAt }),
      ...('lastPublishError' in params && { last_publish_error: params.lastPublishError }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.outputId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toOutput(data as Record<string, unknown>) }
}

export async function listPublishedOutputs(params: {
  workspaceId: string
  platform?: ChannelPlatform
  since?: string
  limit?: number
  offset?: number
}): Promise<DomainResult<Output[]>> {
  const supabase = await createClient()
  let query = supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, generation_group_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, published_at, scheduled_at, last_publish_error, approved_for_week, week_bucket, performance_snapshot, created_at, updated_at, channels(platform, label)')
    .eq('workspace_id', params.workspaceId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.since) query = query.gte('published_at', params.since)
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }

  let rows = (data as Record<string, unknown>[]).map(toOutput)
  if (params.platform) {
    rows = rows.filter((o) => o.channels?.platform === params.platform)
  }

  return { ok: true, data: rows }
}

export async function updatePerformanceSnapshot(params: {
  outputId: string
  workspaceId: string
  snapshot: PerformanceSnapshot
}): Promise<DomainResult<Output>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .update({
      performance_snapshot: params.snapshot as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.outputId)
    .eq('workspace_id', params.workspaceId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toOutput(data as Record<string, unknown>) }
}

export async function createOutputVersion(params: {
  outputId: string
  content: OutputContent
  editedBy: string
  changeSummary?: string
}): Promise<DomainResult<OutputVersion>> {
  const supabase = await createClient()

  const { data: latest } = await supabase
    .from('output_versions')
    .select('version_number')
    .eq('output_id', params.outputId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = latest ? (latest.version_number as number) + 1 : 1

  const { data, error } = await supabase
    .from('output_versions')
    .insert({
      output_id: params.outputId,
      version_number: nextVersion,
      content: params.content as unknown as Json,
      edited_by: params.editedBy,
      change_summary: params.changeSummary ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toOutputVersion(data as Record<string, unknown>) }
}
