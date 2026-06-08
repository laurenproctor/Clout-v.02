import { schedules, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

export const cleanupBlueSkyOAuthStatesTask = schedules.task({
  id: 'cleanup-bluesky-oauth-states',
  cron: '0 3 * * *',  // 3am UTC daily
  run: async () => {
    const supabase = createServiceClient()
    const cutoff = new Date().toISOString()
    const { count, error } = await supabase
      .from('bluesky_oauth_states')
      .delete()
      .lt('expires_at', cutoff)
      .select('*', { count: 'exact', head: true })

    if (error) {
      await logger.error('cleanup-bluesky-oauth-states: delete failed', { error: error.message })
      throw new Error(error.message)
    }

    await logger.info('cleanup-bluesky-oauth-states: complete', { deleted: count ?? 0 })
  },
})
