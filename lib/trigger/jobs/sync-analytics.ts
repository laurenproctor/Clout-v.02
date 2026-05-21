import { task, logger } from '@trigger.dev/sdk/v3'
import { syncGA4ForWorkspace } from '@/lib/analytics/ga4/sync'
import { syncGSCForWorkspace } from '@/lib/analytics/gsc/sync'
import { createServiceClient } from '@/lib/supabase/service'

export const syncAnalyticsTask = task({
  id: 'sync-analytics',
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  run: async (payload: { workspaceId: string; days?: number }) => {
    const days = payload.days ?? 30
    logger.info('Starting analytics sync', { workspaceId: payload.workspaceId, days })

    const [ga4Result, gscResult] = await Promise.allSettled([
      syncGA4ForWorkspace(payload.workspaceId, days),
      syncGSCForWorkspace(payload.workspaceId, days),
    ])

    const ga4Rows = ga4Result.status === 'fulfilled' ? ga4Result.value.rows : 0
    const gscRows = gscResult.status === 'fulfilled' ? gscResult.value.rows : 0

    if (ga4Result.status === 'rejected') {
      logger.error('GA4 sync failed', { error: String(ga4Result.reason) })
    }
    if (gscResult.status === 'rejected') {
      logger.error('GSC sync failed', { error: String(gscResult.reason) })
    }

    logger.info('Analytics sync complete', { ga4Rows, gscRows })
    return { ga4Rows, gscRows }
  },
})

export const syncAllAnalyticsTask = task({
  id: 'sync-all-analytics',
  maxDuration: 300,
  run: async () => {
    const supabase = createServiceClient()
    const { data: connections } = await (supabase as any)
      .from('analytics_connections')
      .select('workspace_id')
      .eq('provider', 'ga4')

    const workspaceIds = [...new Set((connections ?? []).map((c: { workspace_id: string }) => c.workspace_id))]
    logger.info('Syncing analytics for workspaces', { count: workspaceIds.length })

    // Sequential processing — simpler than p-limit and sufficient for v1 volumes
    let synced = 0
    let failed = 0
    for (const workspaceId of workspaceIds as string[]) {
      try {
        await syncAnalyticsTask.triggerAndWait({ workspaceId })
        synced++
      } catch (e) {
        logger.error('Workspace sync failed', { workspaceId, error: String(e) })
        failed++
      }
    }

    return { synced, failed }
  },
})
