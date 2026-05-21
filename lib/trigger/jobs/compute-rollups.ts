import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

export const computeRollupsTask = task({
  id: 'compute-rollups',
  maxDuration: 120,
  run: async (payload: { workspaceId: string }) => {
    const supabase = createServiceClient()
    const { workspaceId } = payload

    // Call the PostgreSQL rollup functions created in the analytics migration.
    // These are security-definer functions — service role can call them.
    const [lensResult, narrativeResult] = await Promise.allSettled([
      (supabase as any).rpc('compute_lens_performance', { p_workspace_id: workspaceId }),
      (supabase as any).rpc('compute_narrative_performance', { p_workspace_id: workspaceId }),
    ])

    if (lensResult.status === 'rejected') {
      logger.error('Lens rollup failed', { workspaceId, error: String(lensResult.reason) })
    }
    if (narrativeResult.status === 'rejected') {
      logger.error('Narrative rollup failed', { workspaceId, error: String(narrativeResult.reason) })
    }

    const ok = lensResult.status === 'fulfilled' && narrativeResult.status === 'fulfilled'
    logger.info('Rollups complete', { workspaceId, ok })
    return { ok }
  },
})
