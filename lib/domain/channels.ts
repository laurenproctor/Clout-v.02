import { createClient } from '@/lib/supabase/server'
import type { ChannelPlatform } from '@/types/domain'

const DEFAULT_CONFIG: Partial<Record<ChannelPlatform, Record<string, unknown>>> = {
  linkedin:  { char_limit: 3000, hashtag_count: 5 },
  twitter:   { char_limit: 280 },
  threads:   { char_limit: 500, soft_limit: 200 },
  facebook:  {},
  instagram: {},
  tiktok:    {},
  newsletter: {},
}

export async function createOrUpdateChannelByAccountId(params: {
  workspaceId: string
  platform: ChannelPlatform
  accountId: string
  accountType: 'personal' | 'page' | 'business'
  label: string
}): Promise<{ channelId: string; created: boolean }> {
  const supabase = await createClient()
  const { workspaceId, platform, accountId, accountType, label } = params

  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .eq('account_id', accountId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('channels')
      .update({ label, is_active: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    return { channelId: existing.id, created: false }
  }

  const { data: newCh, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      platform,
      label,
      account_id:   accountId,
      account_type: accountType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config:       (DEFAULT_CONFIG[platform] ?? {}) as any,
      is_active:    true,
    })
    .select('id')
    .single()

  if (error || !newCh) {
    throw new Error(error?.message ?? 'Failed to create channel')
  }

  return { channelId: newCh.id, created: true }
}
