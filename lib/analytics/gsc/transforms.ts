import type { GSCRow } from './queries'

export interface SearchConsoleInsert {
  workspace_id: string
  site_url: string
  query: string
  landing_page: string
  clicks: number
  impressions: number
  ctr: number | null
  avg_position: number | null
  recorded_at: string
}

export function transformGSCRows(
  rows: GSCRow[],
  workspaceId: string,
  siteUrl: string,
): SearchConsoleInsert[] {
  return rows.map((row) => ({
    workspace_id: workspaceId,
    site_url: siteUrl,
    query: row.query,
    landing_page: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr ?? null,
    avg_position: row.position ?? null,
    recorded_at: row.date,
  }))
}
