import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { upsertAnalyticsProperty } from '@/lib/analytics/connections'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { propertyId?: string; propertyName?: string }
  if (!body.propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

  await upsertAnalyticsProperty({
    workspace_id: session.workspaceId,
    property_type: 'ga4_property',
    property_id: body.propertyId,
    property_name: body.propertyName ?? null,
  })

  return NextResponse.json({ ok: true })
}
