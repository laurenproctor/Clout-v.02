import type { GA4Row } from './queries'

export interface AnalyticsEventInsert {
  workspace_id: string
  property_id: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  landing_page: string | null
  session_count: number
  engaged_sessions: number
  avg_engagement_time: number | null
  conversions: number
  revenue: number | null
  event_date: string
}

export function transformGA4Rows(
  rows: GA4Row[],
  workspaceId: string,
  propertyId: string,
): AnalyticsEventInsert[] {
  return rows.map((row) => ({
    workspace_id: workspaceId,
    property_id: propertyId,
    utm_source: row.sessionSource === '(direct)' ? null : row.sessionSource,
    utm_medium: row.sessionMedium === '(none)' ? null : row.sessionMedium,
    utm_campaign: row.sessionCampaignName === '(not set)' ? null : row.sessionCampaignName,
    utm_content: row.sessionManualAdContent === '(not set)' ? null : row.sessionManualAdContent,
    landing_page: row.landingPage,
    session_count: row.sessions,
    engaged_sessions: row.engagedSessions,
    avg_engagement_time: row.avgEngagementTime || null,
    conversions: row.conversions,
    revenue: row.totalRevenue || null,
    event_date: `${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}`,
  }))
}
