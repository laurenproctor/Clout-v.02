import { createServiceClient } from '@/lib/supabase/service'
import type {
  ProviderConnection,
  ProviderConnectionSafe,
  PublishedContent,
  CreateConnectionInput,
  CreatePublishedContentInput,
  PublishingProviderId,
  PublishState,
} from './types'
import type { DomainResult } from '@/types/domain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToConnection(row: Record<string, unknown>): ProviderConnection {
  return {
    id:                        row.id as string,
    workspaceId:               row.workspace_id as string,
    createdBy:                 row.created_by as string,
    provider:                  row.provider as PublishingProviderId,
    label:                     row.label as string,
    siteUrl:                   row.site_url as string,
    encryptedAccessToken:      row.encrypted_access_token as string,
    metadata:                  (row.metadata as Record<string, unknown>) ?? {},
    isActive:                  row.is_active as boolean,
    lastSuccessfulPublishAt:   (row.last_successful_publish_at as string | null) ?? null,
    lastFailedPublishAt:       (row.last_failed_publish_at as string | null) ?? null,
    consecutiveFailureCount:   (row.consecutive_failure_count as number) ?? 0,
    lastErrorMessage:          (row.last_error_message as string | null) ?? null,
    createdAt:                 row.created_at as string,
    updatedAt:                 row.updated_at as string,
  }
}

function toSafe(c: ProviderConnection): ProviderConnectionSafe {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encryptedAccessToken: _, createdBy: __, ...safe } = c
  return safe
}

function rowToPublishedContent(row: Record<string, unknown>): PublishedContent {
  return {
    id:                      row.id as string,
    workspaceId:             row.workspace_id as string,
    userId:                  row.user_id as string,
    connectionId:            (row.connection_id as string | null) ?? null,
    provider:                row.provider as PublishingProviderId,
    providerContentId:       (row.provider_content_id as string | null) ?? null,
    providerUrl:             (row.provider_url as string | null) ?? null,
    title:                   row.title as string,
    slug:                    (row.slug as string | null) ?? null,
    status:                  row.status as PublishState,
    sourceType:              row.source_type as 'blog' | 'manual',
    sourceId:                (row.source_id as string | null) ?? null,
    canonicalContentId:      (row.canonical_content_id as string | null) ?? null,
    idempotencyKey:          (row.idempotency_key as string | null) ?? null,
    contentHash:             (row.content_hash as string | null) ?? null,
    providerMetadataVersion: (row.provider_metadata_version as string) ?? 'v1',
    metadata:                (row.metadata as Record<string, unknown>) ?? {},
    publishedAt:             (row.published_at as string | null) ?? null,
    createdAt:               row.created_at as string,
    updatedAt:               row.updated_at as string,
  }
}

// ─── Connections ──────────────────────────────────────────────────────────────

export async function createConnection(
  input: CreateConnectionInput,
): Promise<DomainResult<ProviderConnection>> {
  const supabase: AnyClient = createServiceClient()
  const { data, error } = await supabase
    .from('publishing_connections')
    .insert({
      workspace_id:            input.workspaceId,
      created_by:              input.userId,
      provider:                input.provider,
      label:                   input.label,
      site_url:                input.siteUrl,
      encrypted_access_token:  input.encryptedAccessToken,
      metadata:                input.metadata,
      is_active:               true,
      updated_at:              new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: rowToConnection(data as Record<string, unknown>) }
}

export async function listConnections(
  workspaceId: string,
): Promise<DomainResult<ProviderConnectionSafe[]>> {
  const supabase: AnyClient = createServiceClient()
  const { data, error } = await supabase
    .from('publishing_connections')
    .select()
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    data: (data ?? []).map((row: Record<string, unknown>) => toSafe(rowToConnection(row))),
  }
}

export async function getConnectionWithToken(
  id: string,
  workspaceId: string,
): Promise<DomainResult<ProviderConnection>> {
  const supabase: AnyClient = createServiceClient()
  const { data, error } = await supabase
    .from('publishing_connections')
    .select()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: rowToConnection(data as Record<string, unknown>) }
}

export async function deleteConnection(
  id: string,
  workspaceId: string,
): Promise<DomainResult<void>> {
  const supabase: AnyClient = createServiceClient()
  const { error } = await supabase
    .from('publishing_connections')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function recordConnectionSuccess(connectionId: string): Promise<void> {
  const supabase: AnyClient = createServiceClient()
  await supabase
    .from('publishing_connections')
    .update({
      last_successful_publish_at: new Date().toISOString(),
      consecutive_failure_count:  0,
      last_error_message:         null,
      updated_at:                 new Date().toISOString(),
    })
    .eq('id', connectionId)
}

export async function recordConnectionFailure(
  connectionId: string,
  errorMessage: string,
): Promise<void> {
  const supabase: AnyClient = createServiceClient()
  // Atomic increment of consecutive_failure_count via RPC
  await supabase.rpc('increment_connection_failure', {
    p_connection_id:   connectionId,
    p_error_message:   errorMessage,
    p_failed_at:       new Date().toISOString(),
  })
}

// ─── Published content ────────────────────────────────────────────────────────

export async function createPublishedContentRecord(
  input: CreatePublishedContentInput,
): Promise<DomainResult<PublishedContent>> {
  const supabase: AnyClient = createServiceClient()
  const { data, error } = await supabase
    .from('published_content')
    .insert({
      workspace_id:             input.workspaceId,
      user_id:                  input.userId,
      connection_id:            input.connectionId,
      provider:                 input.provider,
      title:                    input.title,
      slug:                     input.slug ?? null,
      status:                   'queued',
      source_type:              input.sourceType,
      source_id:                input.sourceId ?? null,
      canonical_content_id:     input.canonicalContentId ?? null,
      idempotency_key:          input.idempotencyKey,
      content_hash:             input.contentHash,
      provider_metadata_version: 'v1',
      metadata:                 {},
      updated_at:               new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: rowToPublishedContent(data as Record<string, unknown>) }
}

export async function transitionPublishedContent(
  id: string,
  status: PublishState,
  extra?: {
    providerContentId?: string
    providerUrl?: string
    publishedAt?: string
    errorMessage?: string
  },
): Promise<DomainResult<void>> {
  const supabase: AnyClient = createServiceClient()
  const { error } = await supabase
    .from('published_content')
    .update({
      status,
      ...(extra?.providerContentId && { provider_content_id: extra.providerContentId }),
      ...(extra?.providerUrl        && { provider_url:         extra.providerUrl }),
      ...(extra?.publishedAt        && { published_at:         extra.publishedAt }),
      ...(extra?.errorMessage       && { metadata: { error: extra.errorMessage } }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function listPublishedContent(params: {
  workspaceId: string
  sourceType?: string
  sourceId?: string
  limit?: number
}): Promise<DomainResult<PublishedContent[]>> {
  const supabase: AnyClient = createServiceClient()
  let query = supabase
    .from('published_content')
    .select()
    .eq('workspace_id', params.workspaceId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.sourceType) query = query.eq('source_type', params.sourceType)
  if (params.sourceId)   query = query.eq('source_id',   params.sourceId)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    data: (data ?? []).map((row: Record<string, unknown>) => rowToPublishedContent(row)),
  }
}
