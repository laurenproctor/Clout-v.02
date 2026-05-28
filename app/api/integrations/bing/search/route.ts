import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAnalyticsConnection, getAnalyticsProperty } from '@/lib/analytics/connections'
import { listBingSites, fetchBingKeywords } from '@/lib/analytics/bing/queries'

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getAnalyticsConnection(session.workspaceId, 'bing_wmt')
  if (!conn) return NextResponse.json({ connected: false })

  try {
    const [sites, selected] = await Promise.all([
      listBingSites(session.workspaceId),
      getAnalyticsProperty(session.workspaceId, 'bing_wmt_site'),
    ])

    const selectedSiteUrl = selected?.property_id ?? null

    if (!selectedSiteUrl) {
      return NextResponse.json({ connected: true, sites, selectedSiteUrl: null, summary: null })
    }

    const keywords = await fetchBingKeywords(
      session.workspaceId,
      selectedSiteUrl,
      dateStr(28),
      dateStr(1),
    )

    const totalClicks      = keywords.reduce((s, k) => s + k.clicks, 0)
    const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0)
    const avgCtr           = totalImpressions > 0 ? totalClicks / totalImpressions : 0

    const topQueries = keywords
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)

    return NextResponse.json({
      connected: true,
      sites,
      selectedSiteUrl,
      summary: { totalClicks, totalImpressions, avgCtr, topQueries, windowDays: 28 },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
