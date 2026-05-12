// Core publishing logic. Used by the scheduled worker and manual post route.
// Never import from Next.js request context — this runs in Trigger.dev too.
import { createServiceClient } from '@/lib/supabase/service'
import { getChannelCredential, isTokenExpired, upsertChannelCredential } from '@/lib/domain/credentials'
import { createPublishLog } from '@/lib/domain/publish-log'
import { postTextToLinkedIn, uploadImageToLinkedIn, refreshLinkedInToken } from '@/lib/linkedin'

async function getChannelAccountType(channelId: string): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('channels')
    .select('account_type')
    .eq('id', channelId)
    .single()
  return (data?.account_type as string | null) ?? 'personal'
}
import {
  createThreadsTextContainer,
  publishThreadsContainer,
  refreshThreadsToken,
} from '@/lib/threads'
import { postTweet, refreshTwitterToken } from '@/lib/twitter'
import { postToFacebookPage } from '@/lib/facebook'
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
    .select('id, workspace_id, generation_id, title, status, channel_id, content, approved_by, approved_at, provider_post_id, published_at, scheduled_at, last_publish_error, created_at, updated_at')
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

// Acquire a publish lock for manual-trigger routes (any status except already-publishing/published).
// Returns { ok: false } if the output is already being published or has a provider post ID.
// Lock is released naturally by markPublished or markFailed transitioning out of 'publishing'.
export async function acquirePublishLock(outputId: string): Promise<{ ok: boolean }> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('outputs')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', outputId)
    .neq('status', 'publishing')
    .is('provider_post_id', null)
    .select('id')
    .single()
  return { ok: !!data }
}

export async function markPublished(outputId: string, postUrn: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('outputs')
    .update({
      status:             'published',
      provider_post_id:   postUrn,
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
): Promise<{ postUrn: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a LinkedIn channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  // Idempotency: already published
  if (output.providerPostId) {
    return { postUrn: output.providerPostId }
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

  const accountType = await getChannelAccountType(output.channelId)
  const authorUrn = accountType === 'page'
    ? `urn:li:organization:${cred.accountId}`
    : `urn:li:person:${cred.accountId}`

  // Resolve visual asset if one was attached to this draft
  let imageUrn: string | undefined
  const visualAssetId = (output.content as OutputContent & { selectedVisualAssetId?: string }).selectedVisualAssetId
  if (visualAssetId) {
    const supabase = createServiceClient()
    const { data: asset } = await supabase
      .from('visual_assets')
      .select('original_url')
      .eq('id', visualAssetId)
      .single()

    if (asset?.original_url) {
      try {
        imageUrn = await uploadImageToLinkedIn(cred.accessToken, authorUrn, asset.original_url)
      } catch (uploadErr) {
        console.error('[publishing/linkedin] image upload failed', {
          error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          visualAssetId,
        })
        throw Object.assign(
          new Error(`Failed to upload visual to LinkedIn: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}`),
          { code: 'image_upload_failed', retryable: true }
        )
      }
    }
  }

  const startedAt = Date.now()
  let postUrn: string

  try {
    postUrn = await postTextToLinkedIn(cred.accessToken, authorUrn, text, imageUrn)
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

  return { postUrn }
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export function formatThreadsText(content: OutputContent): string {
  const body = content.body?.trim() ?? ''
  const hashtags = (content.hashtags as string[] | undefined) ?? []
  // Max 1 hashtag on Threads
  const tag = hashtags[0] ? `#${hashtags[0]}` : ''
  return [body, tag].filter(Boolean).join('\n').trim()
}

export async function publishThreadsOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a Threads channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('Threads account not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  let cred = credResult.data

  // Threads uses same-token refresh — no separate refresh_token
  if (isTokenExpired(cred.expiresAt)) {
    try {
      const refreshed = await refreshThreadsToken(cred.accessToken)
      const upsertResult = await upsertChannelCredential({
        channelId:    output.channelId,
        workspaceId:  output.workspaceId,
        accessToken:  refreshed.access_token,
        refreshToken: null,
        expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
        accountId:    cred.accountId,
        accountName:  cred.accountName,
        accountEmail: cred.accountEmail,
      })
      if (!upsertResult.ok) throw new Error('Failed to store refreshed token')
      cred = upsertResult.data
    } catch (refreshErr) {
      if (isAuthError(refreshErr)) {
        throw Object.assign(
          new Error('Threads session expired and could not be refreshed. Please reconnect your account.'),
          { code: 'token_expired', retryable: false }
        )
      }
      throw refreshErr
    }
  }

  if (!cred.accountId) {
    throw Object.assign(
      new Error('Threads account ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  const text = formatThreadsText(output.content as OutputContent)
  if (!text) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postId: string

  try {
    const { id: creationId } = await createThreadsTextContainer(cred.accessToken, cred.accountId, text)
    // Meta recommends a brief pause between container creation and publish
    await new Promise((resolve) => setTimeout(resolve, 500))
    const { id } = await publishThreadsContainer(cred.accessToken, cred.accountId, creationId)
    postId = id
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'threads',
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
    platform:       'threads',
    status:         'success',
    providerPostId: postId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId }
}

// ─── Twitter / X ─────────────────────────────────────────────────────────────

export function formatTwitterText(content: OutputContent): string {
  const body = content.body?.trim() ?? ''
  const hashtags = ((content.hashtags as string[] | undefined) ?? [])
    .slice(0, 2)
    .map(h => `#${h}`)
    .join(' ')
  return [body, hashtags].filter(Boolean).join('\n').trim()
}

export async function publishTwitterOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign an X channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId }
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
      const refreshed = await refreshTwitterToken(cred.refreshToken)
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
        throw Object.assign(
          new Error('X session expired and could not be refreshed. Please reconnect your account.'),
          { code: 'token_expired', retryable: false }
        )
      }
      throw refreshErr
    }
  }

  const text = formatTwitterText(output.content as OutputContent)
  if (!text) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postId: string

  try {
    const { id } = await postTweet(cred.accessToken, text)
    postId = id
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'twitter',
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
    platform:       'twitter',
    status:         'success',
    providerPostId: postId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId }
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

export function formatFacebookText(title: string | null, content: OutputContent): string {
  const hashtags = ((content.hashtags as string[] | undefined) ?? [])
    .map(h => `#${h}`)
    .join(' ')
  return [title, content.body, hashtags ? `\n${hashtags}` : '']
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

export async function publishFacebookOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a Facebook channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('Facebook page not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  const cred = credResult.data

  // Page access tokens derived from long-lived user tokens do not expire on a schedule.
  // If the token is flagged as expired, the user must reconnect to get a fresh page token.
  if (isTokenExpired(cred.expiresAt)) {
    throw Object.assign(
      new Error('Facebook session expired. Go to Channels and reconnect your account.'),
      { code: 'token_expired', retryable: false }
    )
  }

  if (!cred.accountId) {
    throw Object.assign(
      new Error('Facebook page ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  const text = formatFacebookText(output.title, output.content as OutputContent)
  if (!text) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postId: string

  try {
    const { id } = await postToFacebookPage(cred.accessToken, cred.accountId, text)
    postId = id
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'facebook',
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
    platform:       'facebook',
    status:         'success',
    providerPostId: postId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId }
}

// ─── Platform dispatcher ──────────────────────────────────────────────────────

async function getChannelPlatform(channelId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('channels')
    .select('platform')
    .eq('id', channelId)
    .single()
  return (data?.platform as string | null) ?? null
}

// Dispatches to the correct platform publisher based on channel.platform.
// Use this in the scheduler — it handles routing automatically.
export async function publishOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ providerPostId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post.'),
      { code: 'no_channel', retryable: false }
    )
  }

  const platform = await getChannelPlatform(output.channelId)

  if (platform === 'linkedin') {
    const { postUrn } = await publishLinkedInOutput(output, opts)
    return { providerPostId: postUrn }
  }

  if (platform === 'threads') {
    const { postId } = await publishThreadsOutput(output, opts)
    return { providerPostId: postId }
  }

  if (platform === 'twitter') {
    const { postId } = await publishTwitterOutput(output, opts)
    return { providerPostId: postId }
  }

  if (platform === 'facebook') {
    const { postId } = await publishFacebookOutput(output, opts)
    return { providerPostId: postId }
  }

  throw Object.assign(
    new Error(`Publishing is not yet supported for platform: ${platform ?? 'unknown'}`),
    { code: 'unsupported_platform', retryable: false }
  )
}
