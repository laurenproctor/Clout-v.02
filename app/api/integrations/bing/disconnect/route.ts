import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteAnalyticsConnection } from '@/lib/analytics/connections'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteAnalyticsConnection(session.workspaceId, 'bing_wmt')
  } catch (err) {
    console.error('Failed to disconnect Bing WMT:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
