import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteAnalyticsConnection, getAnalyticsConnection } from '@/lib/analytics/connections'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'ga4')
  if (conn?.access_token) {
    // Best-effort revocation — don't fail if it errors
    await fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, { method: 'POST' })
      .catch(() => {})
  }

  await Promise.all([
    deleteAnalyticsConnection(session.workspaceId, 'ga4'),
    deleteAnalyticsConnection(session.workspaceId, 'gsc'),
  ])

  return NextResponse.json({ ok: true })
}
