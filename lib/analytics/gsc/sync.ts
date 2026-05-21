import { createServiceClient } from '@/lib/supabase/service'
import { getAnalyticsProperty } from '@/lib/analytics/connections'
import { fetchSearchAnalytics } from './queries'
import { transformGSCRows } from './transforms'

export async function syncGSCForWorkspace(workspaceId: string, days = 28): Promise<{ rows: number }> {
  const prop = await getAnalyticsProperty(workspaceId, 'gsc_site')
  if (!prop) return { rows: 0 }

  // GSC data has a ~3-day lag before it's finalized
  const endDate = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - (days + 3) * 86400_000).toISOString().slice(0, 10)

  const rawRows = await fetchSearchAnalytics(workspaceId, prop.property_id, startDate, endDate)
  const inserts = transformGSCRows(rawRows, workspaceId, prop.property_id)

  if (inserts.length === 0) return { rows: 0 }

  const supabase = createServiceClient()
  // search_console_metrics table exists in DB but not yet in types/db.ts
  const { error } = await (supabase as any)
    .from('search_console_metrics')
    .upsert(inserts, { ignoreDuplicates: true })

  if (error) throw new Error(`GSC sync failed: ${error.message}`)
  return { rows: inserts.length }
}
