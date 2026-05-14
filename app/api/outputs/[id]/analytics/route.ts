import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { updatePerformanceSnapshot } from '@/lib/domain/output'
import { fetchPlatformAnalytics, InsufficientScopeError } from '@/lib/domain/analytics'
import type { ChannelPlatform, PerformanceSnapshot } from '@/types/domain'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: outputId } = await params

  // Load the output (user-scoped client enforces workspace isolation via RLS)
  const supabase = await createClient()
  const { data: outputRow, error: outputError } = await supabase
    .from('outputs')
    .select('id, workspace_id, status, provider_post_id, channel_id, performance_snapshot')
    .eq('id', outputId)
    .eq('workspace_id', session.workspaceId)
    .is('deleted_at', null)
    .single()

  if (outputError || !outputRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (outputRow.status !== 'published' || !outputRow.channel_id || !outputRow.provider_post_id) {
    return NextResponse.json({ error: 'Output is not published' }, { status: 400 })
  }

  // Load channel details + credentials (service client for credential access)
  const service = createServiceClient()
  const [{ data: channelRow }, { data: credRow }] = await Promise.all([
    service
      .from('channels')
      .select('platform, account_id, account_type')
      .eq('id', outputRow.channel_id)
      .single(),
    service
      .from('channel_credentials')
      .select('id, channel_id, workspace_id, access_token, refresh_token, expires_at, account_id, account_name, account_email, created_at, updated_at')
      .eq('channel_id', outputRow.channel_id)
      .single(),
  ])

  if (!channelRow || !credRow) {
    return NextResponse.json({ error: 'Channel not connected' }, { status: 400 })
  }

  const credentials = {
    id: credRow.id as string,
    channelId: credRow.channel_id as string,
    workspaceId: credRow.workspace_id as string,
    accessToken: credRow.access_token as string,
    refreshToken: (credRow.refresh_token as string | null) ?? null,
    expiresAt: (credRow.expires_at as number | null) ?? null,
    accountId: (credRow.account_id as string | null) ?? null,
    accountName: (credRow.account_name as string | null) ?? null,
    accountEmail: (credRow.account_email as string | null) ?? null,
    createdAt: credRow.created_at as string,
    updatedAt: credRow.updated_at as string,
  }

  try {
    const snapshot = await fetchPlatformAnalytics({
      platform: channelRow.platform as ChannelPlatform,
      providerPostId: outputRow.provider_post_id as string,
      credentials,
      channelAccountId: (channelRow.account_id as string | null) ?? null,
      channelAccountType: (channelRow.account_type as 'personal' | 'page' | 'business') ?? 'personal',
      existingSnapshot: (outputRow.performance_snapshot as PerformanceSnapshot | null) ?? null,
    })

    const result = await updatePerformanceSnapshot({
      outputId,
      workspaceId: session.workspaceId,
      snapshot,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ snapshot })
  } catch (err) {
    if (err instanceof InsufficientScopeError) {
      return NextResponse.json(
        { error: 'insufficient_scope', message: 'Reconnect this channel to enable analytics' },
        { status: 403 },
      )
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
