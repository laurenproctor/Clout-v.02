// app/api/channels/apple-business-connect/pending-locations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import type { ABCPendingPayload } from '../connect/route'

export interface PendingLocation {
  locationId:  string
  businessId:  string
  companyId:   string
  name:        string
  city:        string | null
  state:       string | null
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('abc_pending')?.value
  if (!token) return NextResponse.json({ error: 'no_pending_locations' }, { status: 404 })

  let payload: ABCPendingPayload
  try {
    payload = verifyCookiePayload<ABCPendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  const locations: PendingLocation[] = payload.locationGroups.flatMap(({ company, business, locations }) =>
    locations.map(loc => ({
      locationId:  loc.id,
      businessId:  business.id,
      companyId:   company.id,
      name:        loc.name,
      city:        loc.address?.city ?? null,
      state:       loc.address?.stateOrProvince ?? null,
    })),
  )

  return NextResponse.json({ locations })
}
