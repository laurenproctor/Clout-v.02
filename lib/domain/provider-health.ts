// lib/domain/provider-health.ts
// Structured logging for provider lifecycle events: connect, refresh, and publish failures.
import { createServiceClient } from '@/lib/supabase/service'

export type ProviderEventType =
  | 'connect_success'
  | 'connect_failed'
  | 'refresh_failed'
  | 'publish_failed'

export interface LogProviderEventInput {
  workspaceId:   string
  channelId?:    string | null
  platform:      string
  eventType:     ProviderEventType
  errorCode?:    string | null
  errorMessage?: string | null
  metadata?:     Record<string, unknown>
}

export async function logProviderEvent(input: LogProviderEventInput): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('provider_health_logs').insert({
    workspace_id:  input.workspaceId,
    channel_id:    input.channelId ?? null,
    platform:      input.platform,
    event_type:    input.eventType,
    error_code:    input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
    metadata:      (input.metadata ?? {}) as import('@/types/db').Json,
  })
  // Never throw — health logging must not break the publish path
  if (error) console.error('provider-health: failed to write log', error.message)
}
