import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { upsertChannelCredential, getChannelCredential } from '@/lib/domain/credentials'
import { createServiceClient } from '@/lib/supabase/service'
import type { GBPPendingPayload } from '../callback/route'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gbp_pending_locations')?.value
  if (!token) {
    return NextResponse.json({ error: 'no_pending_locations' }, { status: 404 })
  }

  let payload: GBPPendingPayload
  try {
    payload = verifyCookiePayload<GBPPendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { locationNames?: string[] }
  const { locationNames } = body

  if (!Array.isArray(locationNames) || locationNames.length === 0) {
    return NextResponse.json({ error: 'locationNames required' }, { status: 400 })
  }

  const { workspaceId, locationPairs, accessToken, refreshToken, expiresIn } = payload
  const supabase = createServiceClient()
  const channelIds: string[] = []

  for (const locationName of locationNames) {
    // Find the matching location across all account pairs
    let matchedLocation: GBPPendingPayload['locationPairs'][0]['locations'][0] | undefined
    let matchedAccount:  GBPPendingPayload['locationPairs'][0]['account'] | undefined
    for (const pair of locationPairs) {
      const loc = pair.locations.find(l => l.name === locationName)
      if (loc) { matchedLocation = loc; matchedAccount = pair.account; break }
    }

    if (!matchedLocation || !matchedAccount) continue

    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'google_business_profile',
      accountId:   matchedLocation.name,
      accountType: 'business',
      label:       matchedLocation.title,
    })

    // Resolve refresh token: Google may not return one on reconnect flows.
    // Preserve the existing stored token rather than overwriting with null.
    let resolvedRefreshToken = refreshToken
    if (!resolvedRefreshToken) {
      const existing = await getChannelCredential(channelId)
      resolvedRefreshToken = existing.ok ? (existing.data.refreshToken ?? null) : null
    }

    await upsertChannelCredential({
      channelId,
      workspaceId,
      accessToken,
      refreshToken: resolvedRefreshToken,
      expiresAt:    Math.floor(Date.now() / 1000) + expiresIn,
      accountId:    matchedLocation.name,
      accountName:  matchedLocation.title,
      accountEmail: null,
    })

    // Store GBP-specific metadata on the channel row
    const addr = matchedLocation.storefrontAddress
    await supabase
      .from('channels')
      .update({
        google_location_name:        matchedLocation.name,
        google_location_numeric_id:  matchedLocation.name.split('/').pop() ?? null,
        google_account_id:           matchedAccount.name,
        google_location_address:     (addr ?? null) as import('@/types/db').Json | null,
        google_verified:             matchedLocation.isVerified ?? false,
        google_profile_photo_url:    matchedLocation.profilePhotoUrl ?? null,
        updated_at:                  new Date().toISOString(),
      })
      .eq('id', channelId)

    channelIds.push(channelId)
  }

  const res = NextResponse.json({ ok: true, channelIds })
  res.cookies.delete('gbp_pending_locations')
  return res
}
