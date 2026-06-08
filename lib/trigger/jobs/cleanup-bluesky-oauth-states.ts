import { schedules, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

export const cleanupBlueSkyOAuthStatesTask = schedules.task({
  id: 'cleanup-bluesky-oauth-states',
  cron: '0 3 * * *',  // 3am UTC daily
  run: async () => {
    const supabase = createServiceClient()
    const cutoff = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('bluesky_oauth_states')
      .delete()
      .lt('expires_at', cutoff)
      .select('*', { count: 'exact', head: true }) as { count: number | null; error: { message: string } | null }

    if (error) {
      await logger.error('cleanup-bluesky-oauth-states: delete failed', { error: error.message })
      throw new Error(error.message)
    }

    await logger.info('cleanup-bluesky-oauth-states: complete', { deleted: count ?? 0 })
  },
})
