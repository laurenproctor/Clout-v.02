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
  bluesky:   { char_limit: 300 },
  mastodon:  { char_limit: 500 },
  pinterest: { char_limit: 500 },
}

export async function createOrUpdateChannelByAccountId(params: {
  workspaceId: string
  platform: ChannelPlatform
  accountId: string
  accountType: 'personal' | 'page' | 'business'
  label: string
  profileImageUrl?: string | null
}): Promise<{ channelId: string; created: boolean }> {
  const supabase = await createClient()
  const { workspaceId, platform, accountId, accountType, label, profileImageUrl } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('channels') as any)
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .eq('account_id', accountId)
    .maybeSingle() as { data: { id: string } | null }

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('channels') as any)
      .update({
        label,
        is_active: true,
        updated_at: new Date().toISOString(),
        ...(profileImageUrl !== undefined ? { profile_image_url: profileImageUrl } : {}),
      })
      .eq('id', existing.id)
    return { channelId: existing.id, created: false }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newCh, error } = await (supabase.from('channels') as any)
    .insert({
      workspace_id:      workspaceId,
      platform,
      label,
      account_id:        accountId,
      account_type:      accountType,
      profile_image_url: profileImageUrl ?? null,
      config:            (DEFAULT_CONFIG[platform] ?? {}),
      is_active:         true,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !newCh) {
    throw new Error(error?.message ?? 'Failed to create channel')
  }

  return { channelId: newCh.id, created: true }
}
