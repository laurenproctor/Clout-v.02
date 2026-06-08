// app/api/channels/apple-business-connect/select-locations/route.ts
// First place credentials are persisted to the database.
import { NextRequest, NextResponse } from 'next/server'
import { verifyCookiePayload } from '@/lib/signed-cookie'
import { upsertProviderCredential } from '@/lib/domain/provider-credentials'
import { createOrUpdateChannelByAccountId } from '@/lib/domain/channels'
import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/types/db'
import type { ABCPendingPayload } from '../connect/route'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('abc_pending')?.value
  if (!token) return NextResponse.json({ error: 'no_pending_locations' }, { status: 404 })

  let payload: ABCPendingPayload
  try {
    payload = verifyCookiePayload<ABCPendingPayload>(token)
  } catch {
    return NextResponse.json({ error: 'cookie_invalid_or_expired' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { locationIds?: string[] }
  if (!Array.isArray(body.locationIds) || body.locationIds.length === 0) {
    return NextResponse.json({ error: 'locationIds required' }, { status: 400 })
  }

  const { workspaceId, credentials, locationGroups } = payload

  const { id: providerCredId } = await upsertProviderCredential({
    workspaceId,
    provider:    'apple_business_connect',
    data:        credentials as unknown as Record<string, unknown>,
    connectedBy: workspaceId,
  })

  const supabase     = createServiceClient()
  const channelIds: string[] = []

  for (const locationId of body.locationIds) {
    let matchedLoc: ABCPendingPayload['locationGroups'][0]['locations'][0] | undefined
    let matchedGroup: ABCPendingPayload['locationGroups'][0] | undefined

    for (const group of locationGroups) {
      const loc = group.locations.find(l => l.id === locationId)
      if (loc) { matchedLoc = loc; matchedGroup = group; break }
    }
    if (!matchedLoc || !matchedGroup) continue

    const { channelId } = await createOrUpdateChannelByAccountId({
      workspaceId,
      platform:    'apple_business_connect',
      accountId:   matchedLoc.id,
      accountType: 'business',
      label:       matchedLoc.name,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('channels')
      .update({
        provider_credential_id: providerCredId,
        apple_company_id:       matchedGroup.company.id,
        apple_business_id:      matchedGroup.business.id,
        apple_location_id:      matchedLoc.id,
        apple_location_name:    matchedLoc.name,
        apple_address:          (matchedLoc.address ?? null) as Json | null,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', channelId)

    channelIds.push(channelId)
  }

  const res = NextResponse.json({ ok: true, channelIds })
  res.cookies.delete('abc_pending')
  return res
}
