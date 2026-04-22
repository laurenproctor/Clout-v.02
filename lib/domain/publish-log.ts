// lib/domain/publish-log.ts
// Publish logs are operational infrastructure — queryable for failure analysis.
import { createServiceClient } from '@/lib/supabase/service'
import type { PublishLog, CreatePublishLogInput } from '@/types/credentials'
import type { DomainResult } from '@/types/domain'

function mapRow(row: Record<string, unknown>): PublishLog {
  return {
    id:             row.id as string,
    workspaceId:    row.workspace_id as string,
    outputId:       row.output_id as string,
    channelId:      (row.channel_id as string | null) ?? null,
    platform:       row.platform as string,
    status:         row.status as 'success' | 'failed',
    providerPostId: (row.provider_post_id as string | null) ?? null,
    errorCode:      (row.error_code as string | null) ?? null,
    errorMessage:   (row.error_message as string | null) ?? null,
    wasRetry:       (row.was_retry as boolean) ?? false,
    durationMs:     (row.duration_ms as number | null) ?? null,
    createdAt:      row.created_at as string,
  }
}

export async function createPublishLog(
  input: CreatePublishLogInput
): Promise<DomainResult<PublishLog>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('publish_logs')
    .insert({
      workspace_id:     input.workspaceId,
      output_id:        input.outputId,
      channel_id:       input.channelId ?? null,
      platform:         input.platform,
      status:           input.status,
      provider_post_id: input.providerPostId ?? null,
      error_code:       input.errorCode ?? null,
      error_message:    input.errorMessage ?? null,
      was_retry:        input.wasRetry ?? false,
      duration_ms:      input.durationMs ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: mapRow(data as Record<string, unknown>) }
}

export async function getPublishLogs(
  workspaceId: string,
  opts?: { outputId?: string; status?: 'success' | 'failed'; limit?: number }
): Promise<DomainResult<PublishLog[]>> {
  const supabase = createServiceClient()
  let query = supabase
    .from('publish_logs')
    .select()
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50)

  if (opts?.outputId) query = query.eq('output_id', opts.outputId)
  if (opts?.status)   query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(mapRow) }
}
