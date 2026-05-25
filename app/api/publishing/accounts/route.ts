import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'

export type PublishingAccount = {
  credentialId: string
  channelId: string
  platform: string
  accountId: string
  displayName: string
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: credentials } = await supabase
    .from('channel_credentials')
    .select('id, channel_id, account_id, account_name, channels(id, platform)')
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: true })

  const accounts: PublishingAccount[] = (credentials ?? []).map((c: any) => {
    const ch = c.channels as { id: string; platform: string } | null
    return {
      credentialId: c.id,
      channelId: ch?.id ?? c.channel_id,
      platform: ch?.platform ?? 'unknown',
      accountId: c.account_id ?? '',
      displayName: c.account_name ?? c.account_id ?? 'Account',
    }
  })

  return NextResponse.json({ accounts })
}
