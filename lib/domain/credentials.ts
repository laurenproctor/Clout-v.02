// lib/domain/credentials.ts
import { createServiceClient } from '@/lib/supabase/service'
import type { ChannelCredential, UpsertChannelCredentialInput } from '@/types/credentials'
import type { DomainResult } from '@/types/domain'

function mapRow(row: Record<string, unknown>): ChannelCredential {
  return {
    id:           row.id as string,
    channelId:    row.channel_id as string,
    workspaceId:  row.workspace_id as string,
    accessToken:  row.access_token as string,
    refreshToken: (row.refresh_token as string | null) ?? null,
    expiresAt:    (row.expires_at as number | null) ?? null,
    accountId:    (row.account_id as string | null) ?? null,
    accountName:  (row.account_name as string | null) ?? null,
    accountEmail: (row.account_email as string | null) ?? null,
    createdAt:    row.created_at as string,
    updatedAt:    row.updated_at as string,
  }
}

export async function upsertChannelCredential(
  input: UpsertChannelCredentialInput
): Promise<DomainResult<ChannelCredential>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('channel_credentials')
    .upsert(
      {
        channel_id:    input.channelId,
        workspace_id:  input.workspaceId,
        access_token:  input.accessToken,
        refresh_token: input.refreshToken ?? null,
        expires_at:    input.expiresAt ?? null,
        account_id:    input.accountId ?? null,
        account_name:  input.accountName ?? null,
        account_email: input.accountEmail ?? null,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'channel_id' }
    )
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: mapRow(data as Record<string, unknown>) }
}

export async function getChannelCredential(
  channelId: string
): Promise<DomainResult<ChannelCredential>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('channel_credentials')
    .select()
    .eq('channel_id', channelId)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: mapRow(data as Record<string, unknown>) }
}

export async function deleteChannelCredential(channelId: string): Promise<DomainResult<void>> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('channel_credentials')
    .delete()
    .eq('channel_id', channelId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false
  return expiresAt < Math.floor(Date.now() / 1000) + 60 // 60s safety buffer
}
