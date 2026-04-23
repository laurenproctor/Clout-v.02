// Core publishing logic. Used by the scheduled worker and manual post route.
// Never import from Next.js request context — this runs in Trigger.dev too.
import { createServiceClient } from '@/lib/supabase/service'
import { getChannelCredential, isTokenExpired, upsertChannelCredential } from '@/lib/domain/credentials'
import { createPublishLog } from '@/lib/domain/publish-log'
import { logProviderEvent } from '@/lib/domain/provider-health'
import { postTextToLinkedIn, refreshLinkedInToken } from '@/lib/linkedin'
import { postTweet, postThread, refreshXToken, xPostUrl } from '@/lib/providers/x/client'
import { formatXText, splitIntoThread, X_CHAR_LIMIT } from '@/lib/providers/x/format'
import type { Output, OutputContent, OutputStatus } from '@/types/domain'

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatLinkedInText(title: string | null, content: OutputContent): string {
  const hashtags = ((content.hashtags as string[] | undefined) ?? [])
    .map((h) => `#${h}`)
    .join(' ')
  return [title, content.body, hashtags ? `\n${hashtags}` : '']
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

// ─── Queue queries ────────────────────────────────────────────────────────────

export async function getDueQueuedPosts(): Promise<Output[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('outputs')
    .select('id, workspace_id, generation_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, provider_post_url, published_at, scheduled_at, last_publish_error, created_at, updated_at')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(20)

  if (error) throw new Error(`getDueQueuedPosts: ${error.message}`)

  return (data ?? []).map((row) => ({
    id:               row.id,
    workspaceId:      row.workspace_id,
    generationId:     row.generation_id,
    channelId:        row.channel_id,
    status:           row.status as OutputStatus,
    title:            row.title,
    content:          row.content as OutputContent,
    approvedBy:       row.approved_by,
    approvedAt:       row.approved_at,
    providerPostId:   row.provider_post_id,
    providerPostUrl:  row.provider_post_url,
    publishedAt:      row.published_at,
    scheduledAt:      row.scheduled_at,
    lastPublishError:    row.last_publish_error,
    approvedForWeek:     false,
    weekBucket:          null,
    performanceSnapshot: null,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  }))
}

// ─── Status transitions ───────────────────────────────────────────────────────

export async function markPublishing(outputId: string): Promise<boolean> {
  // Atomic status guard — prevents duplicate publish runs.
  // Returns false if the row was already moved out of 'queued'.
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('outputs')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', outputId)
    .eq('status', 'queued')
    .select('id')
    .single()
  return !!data
}

export async function markPublished(
  outputId: string,
  postUrn: string,
  postUrl?: string
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('outputs')
    .update({
      status:             'published',
      provider_post_id:   postUrn,
      provider_post_url:  postUrl ?? null,
      published_at:       new Date().toISOString(),
      last_publish_error: null,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', outputId)
}

export async function markFailed(outputId: string, errorMessage: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('outputs')
    .update({
      status:             'failed',
      last_publish_error: errorMessage,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', outputId)
}

export async function recoverStuckPublishing(): Promise<number> {
  // Reset rows stuck in 'publishing' for >10 minutes (worker crash recovery).
  // Called at the start of every cron run before processing new posts.
  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('outputs')
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('status', 'publishing')
    .lt('updated_at', cutoff)
    .select('id')
  return data?.length ?? 0
}

export async function markQueuedAgain(outputId: string): Promise<void> {
  // Used when a transient error exhausted inline retries — put back to queued
  // so the next cron run tries again (rather than permanently failing).
  const supabase = createServiceClient()
  await supabase
    .from('outputs')
    .update({
      status:     'queued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', outputId)
}

// ─── Error classification ─────────────────────────────────────────────────────

export function shouldRetry(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (/\(429\)/.test(msg)) return true
  if (/\(5\d\d\)/.test(msg)) return true
  if (/timeout|network|ECONNRESET|ENOTFOUND|socket hang up/i.test(msg)) return true
  return false
}

export function isAuthError(err: unknown): boolean {
  const code = (err as { code?: string }).code
  if (code === 'token_expired' || code === 'missing_account_id') return true
  const msg = err instanceof Error ? err.message : String(err)
  if (/\(401\)/.test(msg) || /\(403\)/.test(msg)) return true
  return false
}

// ─── Core publish ─────────────────────────────────────────────────────────────

export async function publishLinkedInOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postUrn: string; postUrl: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a LinkedIn channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  // Idempotency: already published
  if (output.providerPostId) {
    const postUrl = output.providerPostUrl
      ?? `https://www.linkedin.com/feed/update/${encodeURIComponent(output.providerPostId)}/`
    return { postUrn: output.providerPostId, postUrl }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('LinkedIn account not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  let cred = credResult.data

  if (isTokenExpired(cred.expiresAt)) {
    if (!cred.refreshToken) {
      throw Object.assign(
        new Error('LinkedIn session expired. Go to Channels and reconnect your account.'),
        { code: 'token_expired', retryable: false }
      )
    }
    try {
      const refreshed = await refreshLinkedInToken(cred.refreshToken)
      const upsertResult = await upsertChannelCredential({
        channelId:    output.channelId,
        workspaceId:  output.workspaceId,
        accessToken:  refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? cred.refreshToken,
        expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
        accountId:    cred.accountId,
        accountName:  cred.accountName,
        accountEmail: cred.accountEmail,
      })
      if (!upsertResult.ok) throw new Error('Failed to store refreshed token')
      cred = upsertResult.data
    } catch (refreshErr) {
      if (isAuthError(refreshErr)) {
        await logProviderEvent({
          workspaceId:  output.workspaceId,
          channelId:    output.channelId,
          platform:     'linkedin',
          eventType:    'refresh_failed',
          errorCode:    'token_expired',
          errorMessage: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        })
        throw Object.assign(
          new Error('LinkedIn session expired and could not be refreshed. Please reconnect your account.'),
          { code: 'token_expired', retryable: false }
        )
      }
      throw refreshErr
    }
  }

  if (!cred.accountId) {
    throw Object.assign(
      new Error('LinkedIn account ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  const text = formatLinkedInText(output.title, output.content as OutputContent)
  if (!text) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postUrn: string

  try {
    postUrn = await postTextToLinkedIn(cred.accessToken, cred.accountId, text)
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'linkedin',
      status:       'failed',
      errorCode:    (err as { code?: string }).code ?? 'publish_error',
      errorMessage: err instanceof Error ? err.message : String(err),
      wasRetry:     opts?.wasRetry ?? false,
      durationMs,
    })
    throw err
  }

  const durationMs = Date.now() - startedAt
  await createPublishLog({
    workspaceId:    output.workspaceId,
    outputId:       output.id,
    channelId:      output.channelId,
    platform:       'linkedin',
    status:         'success',
    providerPostId: postUrn,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  const postUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}/`
  return { postUrn, postUrl }
}

// ─── X publisher ─────────────────────────────────────────────────────────────

export async function publishXOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postUrn: string; postUrl: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign an X channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    const postUrl = output.providerPostUrl ?? xPostUrl(output.providerPostId)
    return { postUrn: output.providerPostId, postUrl }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('X account not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  let cred = credResult.data

  if (isTokenExpired(cred.expiresAt)) {
    if (!cred.refreshToken) {
      throw Object.assign(
        new Error('X session expired. Go to Channels and reconnect your account.'),
        { code: 'token_expired', retryable: false }
      )
    }
    try {
      const refreshed = await refreshXToken(cred.refreshToken)
      const upsertResult = await upsertChannelCredential({
        channelId:    output.channelId,
        workspaceId:  output.workspaceId,
        accessToken:  refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? cred.refreshToken,
        expiresAt:    refreshed.expires_in
          ? Math.floor(Date.now() / 1000) + refreshed.expires_in
          : Math.floor(Date.now() / 1000) + 7200,
        accountId:    cred.accountId,
        accountName:  cred.accountName,
        accountEmail: cred.accountEmail,
      })
      if (!upsertResult.ok) throw new Error('Failed to store refreshed X token')
      cred = upsertResult.data
    } catch (refreshErr) {
      if (isAuthError(refreshErr)) {
        await logProviderEvent({
          workspaceId:  output.workspaceId,
          channelId:    output.channelId,
          platform:     'x',
          eventType:    'refresh_failed',
          errorCode:    'token_expired',
          errorMessage: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        })
        throw Object.assign(
          new Error('X session expired and could not be refreshed. Please reconnect your account.'),
          { code: 'token_expired', retryable: false }
        )
      }
      throw refreshErr
    }
  }

  if (!cred.accountId) {
    throw Object.assign(
      new Error('X account ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  const fullText = formatXText(output.title, output.content as OutputContent)
  if (!fullText) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  const startedAt = Date.now()
  let tweetId: string

  try {
    if (fullText.length <= X_CHAR_LIMIT) {
      tweetId = await postTweet(cred.accessToken, fullText)
    } else {
      tweetId = await postThread(cred.accessToken, splitIntoThread(fullText))
    }
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'x',
      status:       'failed',
      errorCode:    (err as { code?: string }).code ?? 'publish_error',
      errorMessage: err instanceof Error ? err.message : String(err),
      wasRetry:     opts?.wasRetry ?? false,
      durationMs,
    })
    await logProviderEvent({
      workspaceId:  output.workspaceId,
      channelId:    output.channelId,
      platform:     'x',
      eventType:    'publish_failed',
      errorCode:    (err as { code?: string }).code ?? 'publish_error',
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata:     { outputId: output.id, wasRetry: opts?.wasRetry ?? false },
    })
    throw err
  }

  const durationMs = Date.now() - startedAt
  await createPublishLog({
    workspaceId:    output.workspaceId,
    outputId:       output.id,
    channelId:      output.channelId,
    platform:       'x',
    status:         'success',
    providerPostId: tweetId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  const postUrl = xPostUrl(tweetId)
  return { postUrn: tweetId, postUrl }
}

// ─── Platform-aware dispatcher ────────────────────────────────────────────────

/**
 * Routes to the correct provider publisher based on channel platform.
 * Includes a universal idempotency guard — short-circuits before any provider
 * call if the output already has a providerPostId.
 * All route handlers and workers must call this. Never call provider-specific
 * functions directly.
 */
export async function publishOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postUrn: string; postUrl: string }> {
  // Universal idempotency guard — no provider call if already published
  if (output.providerPostId) {
    const postUrl = output.providerPostUrl ?? output.providerPostId
    return { postUrn: output.providerPostId, postUrl }
  }

  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post.'),
      { code: 'no_channel', retryable: false }
    )
  }

  const supabase = createServiceClient()
  const { data: channel } = await supabase
    .from('channels')
    .select('platform')
    .eq('id', output.channelId)
    .single()

  if (!channel) {
    throw Object.assign(
      new Error('Channel not found.'),
      { code: 'no_channel', retryable: false }
    )
  }

  switch (channel.platform) {
    case 'linkedin':
      return publishLinkedInOutput(output, opts)
    case 'x':
      return publishXOutput(output, opts)
    default:
      throw Object.assign(
        new Error(`Publishing not supported for platform: ${channel.platform}`),
        { code: 'unsupported_platform', retryable: false }
      )
  }
}
