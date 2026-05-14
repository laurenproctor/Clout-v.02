import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import type { GBPPendingPayload } from '../callback/route'

export async function GET(req: NextRequest) {
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

  // Return only what the picker UI needs — no tokens
  const locations = payload.locationPairs.flatMap(({ account, locations }) =>
    locations.map(loc => ({
      locationName:    loc.name,
      accountName:     account.name,
      title:           loc.title,
      city:            loc.storefrontAddress?.locality ?? null,
      state:           loc.storefrontAddress?.administrativeArea ?? null,
      isVerified:      loc.isVerified ?? false,
      profilePhotoUrl: loc.profilePhotoUrl ?? null,
    })),
  )

  return NextResponse.json(locations)
}
