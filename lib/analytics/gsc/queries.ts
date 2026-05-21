import { gscPost } from './client'

export interface GSCRow {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  date: string
}

export async function fetchSearchAnalytics(
  workspaceId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GSCRow[]> {
  const body = {
    startDate,
    endDate,
    dimensions: ['query', 'page', 'date'],
    rowLimit: 1000,
  }

  const data = await gscPost(workspaceId, siteUrl, body) as {
    rows?: Array<{
      keys: string[]
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
  }

  return (data.rows ?? []).map((row) => ({
    query: row.keys[0] ?? '',
    page: row.keys[1] ?? '',
    date: row.keys[2] ?? '',
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }))
}
