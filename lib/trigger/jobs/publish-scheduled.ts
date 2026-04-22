import { schedules, logger } from '@trigger.dev/sdk/v3'
import {
  recoverStuckPublishing,
  getDueQueuedPosts,
  publishLinkedInOutput,
  markPublishing,
  markPublished,
  markFailed,
  shouldRetry,
} from '@/lib/domain/publishing'

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [2000, 5000, 10000]

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const publishScheduledPostsTask = schedules.task({
  id: 'publish-scheduled-posts',
  cron: '* * * * *',
  run: async () => {
    // Recovery pass: reset any rows stuck in 'publishing' for >10 min (worker crash)
    const recovered = await recoverStuckPublishing()
    if (recovered > 0) {
      await logger.warn('publish-scheduled: recovered stuck publishing rows', { count: recovered })
    }

    const posts = await getDueQueuedPosts()

    if (posts.length === 0) {
      await logger.info('publish-scheduled: no posts due', {})
      return { processed: 0 }
    }

    await logger.info('publish-scheduled: processing posts', { count: posts.length })
    let published = 0
    let failed = 0

    for (const post of posts) {
      // Atomic guard: skip if another worker already claimed this post
      const claimed = await markPublishing(post.id)
      if (!claimed) {
        await logger.info('publish-scheduled: post already claimed, skipping', { outputId: post.id })
        continue
      }

      let lastError: unknown = null
      let postUrn: string | null = null

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 10000)
        }

        try {
          const result = await publishLinkedInOutput(post, { wasRetry: attempt > 0 })
          postUrn = result.postUrn
          lastError = null
          break
        } catch (err) {
          lastError = err
          const retryable = shouldRetry(err)
          await logger.warn('publish-scheduled: attempt failed', {
            outputId: post.id,
            attempt:  attempt + 1,
            retryable,
            error:    err instanceof Error ? err.message : String(err),
          })
          if (!retryable) break
        }
      }

      if (postUrn) {
        await markPublished(post.id, postUrn)
        published++
        await logger.info('publish-scheduled: published', { outputId: post.id, postUrn })
      } else {
        const message = lastError instanceof Error
          ? lastError.message
          : 'Publish failed after retries'
        await markFailed(post.id, message)
        failed++
        await logger.error('publish-scheduled: failed', {
          outputId: post.id,
          error: message,
        })
      }
    }

    await logger.info('publish-scheduled: run complete', { published, failed })
    return { processed: posts.length, published, failed }
  },
})
