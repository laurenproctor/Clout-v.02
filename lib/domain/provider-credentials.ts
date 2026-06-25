// lib/domain/provider-credentials.ts
// CRUD helpers for workspace_provider_credentials with AES-256-GCM encryption
import { createServiceClient } from '@/lib/supabase/service'
import { encryptWorkspaceSecret, decryptWorkspaceSecret } from '@/lib/security/secrets'

// The workspace_provider_credentials table is not yet in the generated Supabase types,
// so the typed client cannot resolve `.from()` for it. This minimal query surface
// narrows the escape-hatch cast used below.
interface UntypedResult {
  data: Record<string, unknown> | null
  error: { message: string } | null
}
interface UntypedQuery extends PromiseLike<UntypedResult> {
  select(columns: string): UntypedQuery
  upsert(values: Record<string, unknown>, opts?: { onConflict?: string }): UntypedQuery
  update(values: Record<string, unknown>): UntypedQuery
  delete(): UntypedQuery
  eq(column: string, value: unknown): UntypedQuery
  maybeSingle(): UntypedQuery
  single(): UntypedQuery
}
interface UntypedClient {
  from(table: string): UntypedQuery
}

export interface ProviderCredentialRecord<T extends Record<string, unknown>> {
  id:                  string
  workspaceId:         string
  provider:            string
  data:                T
  credentialVersion:   number
  keyVersion:          number
  connectedBy:         string | null
  lastValidatedAt:     string | null
  lastValidationError: string | null
  createdAt:           string
  updatedAt:           string
}

function mapRow<T extends Record<string, unknown>>(row: Record<string, unknown>): ProviderCredentialRecord<T> {
  const decrypted = decryptWorkspaceSecret(row.encrypted_data as string)
  return {
    id:                  row.id as string,
    workspaceId:         row.workspace_id as string,
    provider:            row.provider as string,
    data:                JSON.parse(decrypted) as T,
    credentialVersion:   (row.credential_version as number) ?? 1,
    keyVersion:          (row.key_version as number) ?? 1,
    connectedBy:         (row.connected_by as string | null) ?? null,
    lastValidatedAt:     (row.last_validated_at as string | null) ?? null,
    lastValidationError: (row.last_validation_error as string | null) ?? null,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
  }
}

export async function upsertProviderCredential(params: {
  workspaceId:        string
  provider:           string
  data:               Record<string, unknown>
  credentialVersion?: number
  keyVersion?:        number
  connectedBy:        string
}): Promise<{ id: string }> {
  const supabase  = createServiceClient() as unknown as UntypedClient
  const encrypted = encryptWorkspaceSecret(JSON.stringify(params.data))

  const { data, error } = await supabase
    .from('workspace_provider_credentials')
    .upsert(
      {
        workspace_id:          params.workspaceId,
        provider:              params.provider,
        encrypted_data:        encrypted,
        credential_version:    params.credentialVersion ?? 1,
        key_version:           params.keyVersion ?? 1,
        connected_by:          params.connectedBy,
        last_validation_error: null,
        updated_at:            new Date().toISOString(),
      },
      { onConflict: 'workspace_id,provider' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save provider credential: ${error.message}`)
  return { id: (data as { id: string }).id }
}

export async function getProviderCredential<T extends Record<string, unknown>>(
  workspaceId: string,
  provider:    string,
): Promise<ProviderCredentialRecord<T> | null> {
  const supabase = createServiceClient() as unknown as UntypedClient
  const { data, error } = await supabase
    .from('workspace_provider_credentials')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch provider credential: ${error.message}`)
  if (!data) return null
  return mapRow<T>(data as unknown as Record<string, unknown>)
}

export async function deleteProviderCredential(
  workspaceId: string,
  provider:    string,
): Promise<void> {
  const supabase = createServiceClient() as unknown as UntypedClient
  const { error } = await supabase
    .from('workspace_provider_credentials')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)

  if (error) throw new Error(`Failed to delete provider credential: ${error.message}`)
}

export async function updateProviderCredentialValidation(
  workspaceId: string,
  provider:    string,
  result:      { success: true } | { success: false; error: string },
): Promise<void> {
  const supabase = createServiceClient()
  const update: Record<string, unknown> = {
    last_validated_at:     new Date().toISOString(),
    last_validation_error: result.success ? null : result.error,
    updated_at:            new Date().toISOString(),
  }

  const { error } = await (supabase as unknown as UntypedClient)
    .from('workspace_provider_credentials')
    .update(update)
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)

  if (error) throw new Error(`Failed to update validation status: ${error.message}`)
}
