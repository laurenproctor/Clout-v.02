import { createServiceClient } from '@/lib/supabase/service'

// Persistence for the workspace's Unipile connection state. Monitoring is
// workspace-scoped (it needs the connected account to run searches, not a publishing
// channel), so the connection lives in workspace_feed_settings.linkedin_beta.unipile
// rather than channel_credentials — which would require a channel_id + a non-null
// access_token this flow doesn't have. (channel_credentials.metadata stays reserved
// for Phase 4, when an engagement action acts as a specific connected identity.)

export type UnipileConnectionStatus = 'connected' | 'expired' | 'restricted' | 'revoked'

export interface UnipileConnection {
  accountId: string
  provider: 'linkedin'
  connectedAt: string
  lastSyncAt?: string
  status: UnipileConnectionStatus
}

interface LinkedInBeta {
  monitoring?: boolean
  assistedEngagement?: boolean
  pageFallback?: boolean
  unipile?: UnipileConnection
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function svc(): any {
  return createServiceClient()
}

export async function getUnipileConnection(workspaceId: string): Promise<UnipileConnection | null> {
  const { data } = await svc()
    .from('workspace_feed_settings')
    .select('linkedin_beta')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return (data?.linkedin_beta as LinkedInBeta | null)?.unipile ?? null
}

// Upserts the connection into linkedin_beta without clobbering the sibling beta toggles.
export async function saveUnipileConnection(
  workspaceId: string,
  connection: UnipileConnection,
): Promise<void> {
  const supabase = svc()
  const { data } = await supabase
    .from('workspace_feed_settings')
    .select('linkedin_beta')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  const current = (data?.linkedin_beta as LinkedInBeta | null) ?? {
    monitoring: false,
    assistedEngagement: false,
    pageFallback: false,
  }
  const next: LinkedInBeta = { ...current, unipile: connection }

  await supabase
    .from('workspace_feed_settings')
    .upsert(
      { workspace_id: workspaceId, linkedin_beta: next, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' },
    )
}
