import { createServiceClient } from '@/lib/supabase/service'
import { getAnalyticsProperty } from '@/lib/analytics/connections'
import { fetchSessionsReport } from './queries'
import { transformGA4Rows } from './transforms'

export async function syncGA4ForWorkspace(workspaceId: string, days = 30): Promise<{ rows: number }> {
  const prop = await getAnalyticsProperty(workspaceId, 'ga4_property')
  if (!prop) return { rows: 0 }

  const endDate = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)

  const rawRows = await fetchSessionsReport(workspaceId, prop.property_id, startDate, endDate)
  const inserts = transformGA4Rows(rawRows, workspaceId, prop.property_id)

  if (inserts.length === 0) return { rows: 0 }

  const supabase = createServiceClient()
  // Upsert on the normalized generated columns (_n). These columns exist in DB
  // but not in types/db.ts yet — the onConflict string is correct for the schema.
  const { error } = await (supabase as any)
    .from('analytics_events')
    .upsert(inserts, {
      onConflict: 'workspace_id,property_id,utm_source_n,utm_medium_n,utm_campaign_n,utm_content_n,event_date',
      ignoreDuplicates: false,
    })

  if (error) throw new Error(`GA4 sync failed: ${error.message}`)
  return { rows: inserts.length }
}
