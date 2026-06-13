import { schedules, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'
import { analyzeWebsiteForOpportunities } from '@/lib/website-intelligence/analyze'
import { readCache, mergeIntoCache, writeCache } from '@/app/api/website-intelligence/_cache'

const PER_SITE_TIMEOUT_MS = 60_000
const SKIP_IF_ANALYZED_WITHIN_DAYS = 6

export const websiteIntelligenceWeeklyJob = schedules.task({
  id: 'website-intelligence-weekly',
  // Every Monday at 9:00 AM UTC
  cron: '0 9 * * 1',
  run: async () => {
    const supabase = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase as any)
      .from('workspace_feed_settings')
      .select('workspace_id, website_url, website_feed_cache')
      .not('website_url', 'is', null)
      .neq('website_url', '')

    if (error) {
      await logger.error('Failed to fetch workspace website URLs', { error: error.message })
      return
    }

    type Row = {
      workspace_id: string
      website_url: string
      website_feed_cache: { analyzed_at?: string } | null
    }
    const workspaces: Row[] = rows ?? []
    await logger.info('Starting weekly website intelligence refresh', { total: workspaces.length })

    let succeeded = 0
    let skipped = 0
    let failed = 0

    // Note: sequential + 2s delay keeps external site load reasonable.
    // Replace with p-limit (e.g. limit=5) if workspace count grows significantly.
    for (const { workspace_id, website_url, website_feed_cache } of workspaces) {
      // Skip workspaces scanned recently (avoids redundant work after manual re-analyze)
      const analyzedAt = website_feed_cache?.analyzed_at
      if (analyzedAt) {
        const ageMs = Date.now() - new Date(analyzedAt).getTime()
        const thresholdMs = SKIP_IF_ANALYZED_WITHIN_DAYS * 24 * 60 * 60 * 1000
        if (ageMs < thresholdMs) {
          skipped++
          await logger.info('Skipping recently scanned workspace', { workspace_id, analyzed_at: analyzedAt })
          continue
        }
      }

      try {
        const result = await Promise.race([
          analyzeWebsiteForOpportunities(website_url),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`TIMEOUT: site analysis exceeded ${PER_SITE_TIMEOUT_MS}ms`)),
              PER_SITE_TIMEOUT_MS,
            )
          ),
        ])

        // Merge, don't overwrite. This homepage refresh never re-discovers blog
        // posts (it analyzes a single page), so overwriting would wipe every
        // previously-discovered post each week. `preferNew` refreshes the
        // homepage opportunities in place while preserving everything else.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = await readCache(supabase as any, workspace_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await writeCache(supabase as any, workspace_id, mergeIntoCache(existing, result, { preferNew: true }))
        succeeded++
        await logger.info('Refreshed website intelligence', {
          workspace_id,
          website_url,
          extraction_method: result.meta.extractionMethod,
          duration_ms: result.meta.durationMs,
        })
      } catch (err) {
        failed++
        await logger.warn('Failed to refresh website intelligence', {
          workspace_id,
          website_url,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    await logger.info('Weekly website intelligence refresh complete', { succeeded, skipped, failed })
  },
})
