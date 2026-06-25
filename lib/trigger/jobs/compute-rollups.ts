import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

// These security-definer rollup functions were added in the analytics migration and are
// not present in the generated Supabase RPC types, so `.rpc()` cannot resolve them.
interface UntypedRpcClient {
  rpc(fn: string, params: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>
}

export const computeRollupsTask = task({
  id: 'compute-rollups',
  maxDuration: 120,
  run: async (payload: { workspaceId: string }) => {
    const supabase = createServiceClient() as unknown as UntypedRpcClient
    const { workspaceId } = payload

    // Call the PostgreSQL rollup functions created in the analytics migration.
    // These are security-definer functions — service role can call them.
    const [lensResult, narrativeResult] = await Promise.allSettled([
      supabase.rpc('compute_lens_performance', { p_workspace_id: workspaceId }),
      supabase.rpc('compute_narrative_performance', { p_workspace_id: workspaceId }),
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
