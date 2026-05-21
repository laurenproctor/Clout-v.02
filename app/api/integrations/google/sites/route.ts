import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAnalyticsConnection, getAnalyticsProperty } from '@/lib/analytics/connections'
import { listGSCSites } from '@/lib/analytics/gsc/client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'gsc')
  if (!conn) return NextResponse.json({ connected: false, sites: [], selectedUrl: null })

  try {
    const sites = await listGSCSites(session.workspaceId)
    const selected = await getAnalyticsProperty(session.workspaceId, 'gsc_site')
    return NextResponse.json({ connected: true, sites, selectedUrl: selected?.property_id ?? null })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
