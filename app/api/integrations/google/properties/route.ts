import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAnalyticsConnection, getAnalyticsProperty } from '@/lib/analytics/connections'
import { listGA4Properties } from '@/lib/analytics/ga4/client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'ga4')
  if (!conn) return NextResponse.json({ connected: false, properties: [] })

  try {
    const properties = await listGA4Properties(session.workspaceId)
    const selected = await getAnalyticsProperty(session.workspaceId, 'ga4_property')
    return NextResponse.json({ connected: true, properties, selectedId: selected?.property_id ?? null })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
