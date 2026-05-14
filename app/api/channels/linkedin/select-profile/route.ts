import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import { upsertChannelCredential } from '@/lib/domain/credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'

interface LiProfile {
  id: string
  name: string
  email?: string
  type: 'personal' | 'page'
  profileImageUrl?: string | null
}

interface PendingPayload {
  workspaceId: string
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  profiles: LiProfile[]
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('li_pending_profiles')?.value
  if (!token) {
    return NextResponse.json({ error: 'no_pending_profiles' }, { status: 404 })
  }

  let payload: PendingPayload
  try {
    payload = verifyCookiePayload<PendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { profileId } = body as { profileId?: string }
  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  }

  const profile = payload.profiles.find(p => p.id === profileId)
  if (!profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  }

  const { workspaceId, accessToken, refreshToken, expiresAt } = payload

  try {
    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:        'linkedin',
      accountId:       profile.id,
      accountType:     profile.type,
      label:           profile.name,
      profileImageUrl: profile.profileImageUrl ?? null,
    })

    const credResult = await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken,
      refreshToken,
      expiresAt,
      accountId:    profile.id,
      accountName:  profile.name,
      accountEmail: profile.email ?? null,
    })

    if (!credResult.ok) {
      return NextResponse.json({ error: credResult.error }, { status: 500 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('li_pending_profiles')
  return res
}
