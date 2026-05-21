import { ga4DataPost } from './client'

export interface GA4Row {
  sessionSource: string | null
  sessionMedium: string | null
  sessionCampaignName: string | null
  sessionManualAdContent: string | null
  landingPage: string | null
  date: string
  sessions: number
  engagedSessions: number
  avgEngagementTime: number
  conversions: number
  totalRevenue: number
}

export async function fetchSessionsReport(
  workspaceId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4Row[]> {
  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' },
      { name: 'sessionManualAdContent' },
      { name: 'landingPage' },
      { name: 'date' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ],
    limit: 10000,
  }

  const data = await ga4DataPost(workspaceId, propertyId, 'runReport', body) as {
    rows?: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }

  return (data.rows ?? []).map((row) => ({
    sessionSource: row.dimensionValues[0]?.value || null,
    sessionMedium: row.dimensionValues[1]?.value || null,
    sessionCampaignName: row.dimensionValues[2]?.value || null,
    sessionManualAdContent: row.dimensionValues[3]?.value || null,
    landingPage: row.dimensionValues[4]?.value || null,
    date: row.dimensionValues[5]?.value ?? '',
    sessions: parseInt(row.metricValues[0]?.value ?? '0', 10),
    engagedSessions: parseInt(row.metricValues[1]?.value ?? '0', 10),
    avgEngagementTime: parseFloat(row.metricValues[2]?.value ?? '0'),
    conversions: parseInt(row.metricValues[3]?.value ?? '0', 10),
    totalRevenue: parseFloat(row.metricValues[4]?.value ?? '0'),
  }))
}
