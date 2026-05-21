import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteAnalyticsConnection, getAnalyticsConnection } from '@/lib/analytics/connections'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'ga4')
  if (conn?.access_token) {
    // We only revoke the ga4 token — ga4 and gsc share the same underlying Google
    // OAuth credential, so a single revocation invalidates both. Best-effort: don't
    // fail the disconnect if Google's revoke endpoint is unavailable.
    await fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, { method: 'POST' })
      .catch(() => {})
  }

  try {
    await Promise.all([
      deleteAnalyticsConnection(session.workspaceId, 'ga4'),
      deleteAnalyticsConnection(session.workspaceId, 'gsc'),
    ])
  } catch (err) {
    console.error('Failed to delete analytics connections:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
