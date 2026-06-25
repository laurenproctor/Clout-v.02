import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { getAnalyticsConnection } from '@/lib/analytics/connections'

interface AnalyticsEventRow {
  utm_campaign: string | null
  utm_source: string | null
  utm_medium: string | null
  session_count: number
  engaged_sessions: number
  conversions: number
  revenue: number | null
  avg_engagement_time: number | null
  event_date: string
}

interface SearchMetricRow {
  query: string
  landing_page: string | null
  clicks: number
  impressions: number
  ctr: number | null
  avg_position: number | null
  recorded_at: string
}

// These analytics tables were added in a migration and are not yet present in the
// generated Supabase types, so the typed client cannot resolve `.from()` for them.
// We narrow `supabase` to a minimal query surface that returns rows we cast explicitly.
interface UntypedQueryResult<Row> {
  data: Row[] | null
}
interface UntypedQuery<Row> extends PromiseLike<UntypedQueryResult<Row>> {
  select(columns: string): UntypedQuery<Row>
  eq(column: string, value: unknown): UntypedQuery<Row>
  gte(column: string, value: unknown): UntypedQuery<Row>
  lte(column: string, value: unknown): UntypedQuery<Row>
  order(column: string, opts: { ascending: boolean }): UntypedQuery<Row>
  limit(count: number): UntypedQuery<Row>
}
interface UntypedClient {
  from<Row>(table: string): UntypedQuery<Row>
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 10)

  // analytics_* tables are post-migration and absent from generated types.
  const supabase = createServiceClient() as unknown as UntypedClient
  const workspaceId = session.workspaceId

  const ga4Conn = await getAnalyticsConnection(workspaceId, 'ga4')
  const isConnected = !!ga4Conn

  const [
    eventsRes,
    searchRes,
    attributionRes,
    lensPerformanceRes,
    narrativePerformanceRes,
  ] = await Promise.all([
    supabase
      .from<AnalyticsEventRow>('analytics_events')
      .select('utm_campaign,utm_source,utm_medium,session_count,engaged_sessions,conversions,revenue,avg_engagement_time,event_date')
      .eq('workspace_id', workspaceId)
      .gte('event_date', from)
      .lte('event_date', to)
      .order('event_date', { ascending: true }),

    supabase
      .from<SearchMetricRow>('search_console_metrics')
      .select('query,landing_page,clicks,impressions,ctr,avg_position,recorded_at')
      .eq('workspace_id', workspaceId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('clicks', { ascending: false })
      .limit(100),

    supabase
      .from<Record<string, unknown>>('content_attribution')
      .select('output_id,platform,utm_campaign,utm_source,utm_medium,lens_id,narrative_type')
      .eq('workspace_id', workspaceId),

    supabase
      .from<Record<string, unknown>>('lens_performance')
      .select('lens_id,avg_traffic,avg_conversion_rate,lenses(name)')
      .eq('workspace_id', workspaceId),

    supabase
      .from<Record<string, unknown>>('narrative_performance')
      .select('narrative_type,avg_engagement_rate,avg_conversion_rate,avg_session_duration,sample_size')
      .eq('workspace_id', workspaceId),
  ])

  const events = eventsRes.data ?? []
  const searchMetrics = searchRes.data ?? []
  const attribution = attributionRes.data ?? []
  const lensPerformance = lensPerformanceRes.data ?? []
  const narrativePerformance = narrativePerformanceRes.data ?? []

  // Aggregate top campaigns by session count
  const campaignMap = new Map<string, { sessions: number; conversions: number; sources: Set<string> }>()
  for (const e of events) {
    if (!e.utm_campaign) continue
    const existing = campaignMap.get(e.utm_campaign) ?? { sessions: 0, conversions: 0, sources: new Set() }
    existing.sessions += e.session_count
    existing.conversions += e.conversions
    if (e.utm_source) existing.sources.add(e.utm_source)
    campaignMap.set(e.utm_campaign, existing)
  }

  const topCampaigns = [...campaignMap.entries()]
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 10)
    .map(([campaignId, stats]) => ({
      campaignId,
      sessions: stats.sessions,
      conversions: stats.conversions,
      sources: [...stats.sources],
    }))

  // Overview totals
  const totalSessions = events.reduce((s: number, e: AnalyticsEventRow) => s + e.session_count, 0)
  const totalConversions = events.reduce((s: number, e: AnalyticsEventRow) => s + e.conversions, 0)
  const totalRevenue = events.reduce((s: number, e: AnalyticsEventRow) => s + (e.revenue ?? 0), 0)
  const totalClicks = searchMetrics.reduce((s: number, r: SearchMetricRow) => s + r.clicks, 0)
  const totalImpressions = searchMetrics.reduce((s: number, r: SearchMetricRow) => s + r.impressions, 0)

  // Traffic by source
  const sourceMap = new Map<string, number>()
  for (const e of events) {
    const src = e.utm_source ?? 'direct'
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + e.session_count)
  }
  const sourceBreakdown = [...sourceMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, sessions]) => ({ source, sessions }))

  // Search ranking opportunities: high impressions, avg_position > 10
  const queryMap = new Map<string, { clicks: number; impressions: number; position: number; positionWeightSum: number }>()
  for (const r of searchMetrics) {
    const ex = queryMap.get(r.query) ?? { clicks: 0, impressions: 0, position: 0, positionWeightSum: 0 }
    ex.clicks += r.clicks
    ex.impressions += r.impressions
    // Impression-weighted average position across pages and dates
    const w = r.impressions ?? 0
    ex.positionWeightSum += (r.avg_position ?? 0) * w
    ex.position = ex.impressions > 0 ? ex.positionWeightSum / ex.impressions : 0
    queryMap.set(r.query, ex)
  }
  const rankingOpportunities = [...queryMap.entries()]
    .filter(([, v]) => v.position > 10 && v.impressions > 50)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 20)
    .map(([query, stats]) => ({ query, ...stats }))

  return NextResponse.json({
    isConnected,
    overview: { totalSessions, totalConversions, totalRevenue, totalClicks, totalImpressions },
    sourceBreakdown,
    topCampaigns,
    lensPerformance,
    narrativePerformance,
    searchMetrics: searchMetrics.slice(0, 50),
    rankingOpportunities,
    attribution: attribution.slice(0, 200),
  })
}
