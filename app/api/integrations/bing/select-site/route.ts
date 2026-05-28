import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { upsertAnalyticsProperty } from '@/lib/analytics/connections'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { siteUrl?: string }
  if (!body.siteUrl) return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })

  await upsertAnalyticsProperty({
    workspace_id:  session.workspaceId,
    property_type: 'bing_wmt_site',
    property_id:   body.siteUrl,
    property_name: body.siteUrl,
  })

  return NextResponse.json({ ok: true })
}
