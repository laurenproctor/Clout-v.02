import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAnalyticsConnection, getAnalyticsProperty } from '@/lib/analytics/connections'
import { listGSCSites } from '@/lib/analytics/gsc/client'
import { fetchSearchAnalytics } from '@/lib/analytics/gsc/queries'

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'gsc')
  if (!conn) return NextResponse.json({ connected: false })

  try {
    const [sites, selected] = await Promise.all([
      listGSCSites(session.workspaceId),
      getAnalyticsProperty(session.workspaceId, 'gsc_site'),
    ])

    const selectedSiteUrl = selected?.property_id ?? null

    if (!selectedSiteUrl) {
      return NextResponse.json({ connected: true, sites, selectedSiteUrl: null, summary: null })
    }

    const rows = await fetchSearchAnalytics(
      session.workspaceId,
      selectedSiteUrl,
      dateStr(28),
      dateStr(1),
    )

    const totalClicks      = rows.reduce((s, r) => s + r.clicks, 0)
    const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0)
    const avgCtr           = totalImpressions > 0 ? totalClicks / totalImpressions : 0

    // Roll up by query to get top queries
    const byQuery = new Map<string, { clicks: number; impressions: number; position: number; count: number }>()
    for (const row of rows) {
      const existing = byQuery.get(row.query)
      if (existing) {
        existing.clicks      += row.clicks
        existing.impressions += row.impressions
        existing.position    += row.position
        existing.count       += 1
      } else {
        byQuery.set(row.query, { clicks: row.clicks, impressions: row.impressions, position: row.position, count: 1 })
      }
    }

    const topQueries = [...byQuery.entries()]
      .map(([query, v]) => ({
        query,
        clicks:      v.clicks,
        impressions: v.impressions,
        position:    v.count > 0 ? v.position / v.count : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)

    return NextResponse.json({
      connected: true,
      sites,
      selectedSiteUrl,
      summary: {
        totalClicks,
        totalImpressions,
        avgCtr,
        topQueries,
        windowDays: 28,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
