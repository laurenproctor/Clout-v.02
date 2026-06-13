// Core publishing logic. Used by the scheduled worker and manual post route.
// Never import from Next.js request context — this runs in Trigger.dev too.
import { createServiceClient } from '@/lib/supabase/service'
import { getChannelCredential, isTokenExpired, upsertChannelCredential } from '@/lib/domain/credentials'
import { createPublishLog } from '@/lib/domain/publish-log'
import { logProviderEvent } from '@/lib/domain/provider-health'
import { postTextToLinkedIn, uploadImageToLinkedIn, refreshLinkedInToken } from '@/lib/linkedin'
import { postTweet, postThread, refreshXToken, xPostUrl } from '@/lib/providers/x/client'
import { formatXText, splitIntoThread, X_CHAR_LIMIT } from '@/lib/providers/x/format'
import {
  createThreadsTextContainer,
  publishThreadsContainer,
  refreshThreadsToken,
} from '@/lib/threads'
import { postToFacebookPage } from '@/lib/facebook'
import { createInstagramImageContainer, publishInstagramContainer } from '@/lib/instagram'
import { postToBlueSky, buildBlueSkyPostUrl } from '@/lib/bluesky/publish'
import { postToMastodon, formatMastodonText } from '@/lib/mastodon'
import { createWordPressPost } from '@/lib/wordpress'
import { createLocalPost, normalizeGBPPostState } from '@/lib/channels/google-business-profile/publish'
import { refreshGBPToken } from '@/lib/channels/google-business-profile/auth'
import type { GBPPostTopicType } from '@/lib/channels/google-business-profile/types'
import { GBPApiError } from '@/lib/channels/google-business-profile/types'
import { renderOutputForPlatform } from '@/lib/domain/output-utm'
import { createPin, pinterestPinUrl } from '@/lib/pinterest/client'
import { getValidPinterestToken } from '@/lib/pinterest/credential'
import { resolveBoardForOutput } from '@/lib/pinterest/boards'
import { resolvePinterestImage } from '@/lib/pinterest/image'
import { resolvePinterestDestinationUrl, tagPinterestDestination } from '@/lib/pinterest/destination'
import { assertPinterestReadiness } from '@/lib/pinterest/readiness'
import { resolvePinterestText } from '@/lib/pinterest/content'
import { publishSubstackOutput, SubstackManualFallbackError } from '@/lib/domain/substack-publish'
import { buildSubstackFallback } from '@/lib/publishing/providers/substack/fallback'

// Content types that target Substack. Such an output may only publish when it has a
// selected publishing connection — content type alone never implies a destination.
const SUBSTACK_CONTENT_TYPES = new Set(['substack-note', 'substack-newsletter'])
function isSubstackContentType(contentType: string | null | undefined): boolean {
  return contentType != null && SUBSTACK_CONTENT_TYPES.has(contentType)
}

async function getChannelAccountType(channelId: string): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('channels')
    .select('account_type')
    .eq('id', channelId)
    .single()
  return (data?.account_type as string | null) ?? 'personal'
}
import type { Output, OutputContent, OutputStatus, PublishIntent } from '@/types/domain'

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
    .select('id, workspace_id, generation_id, generation_group_id, campaign_id, content_type, title, status, channel_id, publishing_connection_id, publish_intent, content, approved_by, approved_at, provider_post_id, provider_post_url, published_at, scheduled_at, last_publish_error, created_at, updated_at')
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
    campaignId:       (row.campaign_id as string | null) ?? null,
    status:           row.status as OutputStatus,
    contentType:      (row.content_type as string | null) ?? null,
    title:            row.title,
    content:          row.content as OutputContent,
    approvedBy:       row.approved_by,
    approvedAt:       row.approved_at,
    providerPostId:   row.provider_post_id,
    providerPostUrl:  row.provider_post_url,
    publishedAt:      row.published_at,
    publishingConnectionId: (row.publishing_connection_id as string | null) ?? null,
    publishIntent:    (row.publish_intent as PublishIntent | null) ?? null,
    scheduledAt:      row.scheduled_at,
    lastPublishError:    row.last_publish_error,
    generationGroupId:   row.generation_group_id ?? null,
    approvedForWeek:     false,
    weekBucket:          null,
    performanceSnapshot: null,
    narrativeRole: null,
    narrativeArcId: null,
    narrativeArcName: null,
    goal: null,
    funnelStage: null,
    resonancePrediction: null,
    conceptId: null,
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

export async function unscheduleOutput(outputId: string): Promise<boolean> {
  // Move a queued post back to 'approved' (unschedule). Atomic against the
  // publish cron — returns false if the row already left 'queued' (now
  // publishing/published) or was soft-deleted, so callers can reject (409).
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('outputs')
    .update({ status: 'approved', scheduled_at: null, updated_at: new Date().toISOString() })
    .eq('id', outputId)
    .eq('status', 'queued')       // atomic guard — same pattern as markPublishing
    .is('deleted_at', null)       // never revive a soft-deleted row
    .select('id')
    .maybeSingle()
  return !!data
}

export async function rescheduleOutput(outputId: string, scheduledAt: string): Promise<boolean> {
  // Reschedule a queued post to a new time. Same atomic guard — a post that has
  // just moved into 'publishing' must not be rescheduled. Returns false → 409.
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('outputs')
    .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
    .eq('id', outputId)
    .eq('status', 'queued')       // stays queued; only the time changes
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  return !!data
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

  // Publishing-layer routing (Substack etc.): the PRESENCE of a publishing connection —
  // not the content type — routes an output through the publishing-layer executor.
  if (output.publishingConnectionId) {
    return publishSubstackOutput(output, opts)
  }

  // Substack-shaped content with NO selected publication must never enter a publish flow.
  // Surface the destination-required manual fallback instead of guessing a destination.
  if (isSubstackContentType(output.contentType)) {
    throw new SubstackManualFallbackError(buildSubstackFallback('missing_connection'))
  }

  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post.'),
      { code: 'no_channel', retryable: false }
    )
  }

  const supabase = createServiceClient()
  const { data: channelRow } = await supabase
    .from('channels')
    .select('platform')
    .eq('id', output.channelId)
    .single()

  if (!channelRow) {
    throw Object.assign(
      new Error('Channel not found.'),
      { code: 'no_channel', retryable: false }
    )
  }

  // Cast to string so the switch below works with platform values (like 'bluesky')
  // that post-date the current generated Supabase types.
  const channel = { platform: channelRow.platform as string }

  const outputContent = output.content as Record<string, unknown>
  const { body: renderedBody } = await renderOutputForPlatform({
    workspaceId:   output.workspaceId ?? '',
    platform:      channel.platform,
    outputId:      output.id,
    canonicalId:   output.generationGroupId ?? output.id,
    outputContext: {
      campaignName: outputContent.campaignName as string | undefined,
      cta:          outputContent.cta          as string | undefined,
      lensName:     outputContent.lensName     as string | undefined,
      voice:        outputContent.voiceRegister as string | undefined,
    },
    body: output.content.body ?? '',
  })
  const outputToPublish = renderedBody !== (output.content.body ?? '')
    ? { ...output, content: { ...output.content, body: renderedBody } }
    : output

  switch (channel.platform) {
    case 'linkedin':
      return publishLinkedInOutput(outputToPublish, opts)
    case 'x':
      return publishXOutput(outputToPublish, opts)
    case 'threads': {
      const { postId } = await publishThreadsOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: postId }
    }
    case 'twitter': {
      const { postId } = await publishTwitterOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: postId }
    }
    case 'facebook': {
      const { postId } = await publishFacebookOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: postId }
    }
    case 'wordpress': {
      const { postId } = await publishWordPressOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: postId }
    }
    case 'google_business_profile': {
      const { postName } = await publishGBPOutput(outputToPublish, opts)
      return { postUrn: postName, postUrl: postName }
    }
    case 'instagram': {
      const { postId } = await publishInstagramOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: `https://www.instagram.com/p/${postId}/` }
    }
    case 'bluesky': {
      const { postId } = await publishBlueSkyOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl: buildBlueSkyPostUrl(postId) }
    }
    case 'mastodon': {
      const { postId, postUrl } = await publishMastodonOutput(outputToPublish, opts)
      return { postUrn: postId, postUrl }
    }
    case 'pinterest': {
      const { pinId } = await publishPinterestOutput(outputToPublish, opts)
      return { postUrn: pinId, postUrl: pinterestPinUrl(pinId) }
    }
    case 'tiktok':
      throw Object.assign(
        new Error('TikTok posting requires video content. Text post publishing is not yet supported.'),
        { code: 'media_required', retryable: false }
      )
    default:
      throw Object.assign(
        new Error(`Publishing not supported for platform: ${channel.platform}`),
        { code: 'unsupported_platform', retryable: false }
      )
  }
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
      const refreshed = await refreshXToken(cred.refreshToken)
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
    postId = await postTweet(cred.accessToken, text)
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

async function getChannelAccountId(channelId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('channels')
    .select('account_id')
    .eq('id', channelId)
    .single()
  return (data?.account_id as string | null) ?? null
}

function toWordPressHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

export async function publishWordPressOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a WordPress channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('WordPress site not connected. Go to Channels and reconnect your site.'),
      { code: 'not_connected', retryable: false }
    )
  }
  const cred = credResult.data

  const siteUrl = await getChannelAccountId(output.channelId)
  if (!siteUrl) {
    throw Object.assign(
      new Error('WordPress site URL missing. Please reconnect your site.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  if (!cred.accountName) {
    throw Object.assign(
      new Error('WordPress username missing. Please reconnect your site.'),
      { code: 'missing_account_name', retryable: false }
    )
  }

  const content = output.content as OutputContent
  const body = (content.body as string | undefined) ?? ''
  if (!body.trim()) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postId: string

  try {
    const result = await createWordPressPost(siteUrl, cred.accountName, cred.accessToken, {
      title: output.title ?? '',
      content: toWordPressHtml(body),
    })
    postId = result.postId
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'wordpress',
      status:       'failed',
      errorCode:    (err as { code?: string }).code ?? 'unknown',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      wasRetry:     opts?.wasRetry ?? false,
      durationMs,
    })
    throw err
  }

  const durationMs = Date.now() - startedAt
  await createPublishLog({
    workspaceId:     output.workspaceId,
    outputId:        output.id,
    channelId:       output.channelId,
    platform:        'wordpress',
    status:          'success',
    providerPostId:  postId,
    wasRetry:        opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId }
}

// ─── Google Business Profile ──────────────────────────────────────────────────

export async function publishGBPOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postName: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a Google Business Profile location.'),
      { code: 'no_channel', retryable: false }
    )
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('Google Business Profile account not connected. Go to Channels and reconnect.'),
      { code: 'not_connected', retryable: false }
    )
  }

  let cred = credResult.data

  if (isTokenExpired(cred.expiresAt)) {
    if (!cred.refreshToken) {
      throw Object.assign(
        new Error('Google session expired. Go to Channels and reconnect your account.'),
        { code: 'token_expired', retryable: false }
      )
    }
    try {
      const refreshed = await refreshGBPToken(cred.refreshToken)
      const upsertResult = await upsertChannelCredential({
        channelId:    output.channelId,
        workspaceId:  output.workspaceId,
        accessToken:  refreshed.accessToken,
        refreshToken: cred.refreshToken,  // Google doesn't rotate refresh tokens
        expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expiresIn,
        accountId:    cred.accountId,
        accountName:  cred.accountName,
        accountEmail: cred.accountEmail,
      })
      if (!upsertResult.ok) throw new Error('Failed to store refreshed GBP token')
      cred = upsertResult.data
    } catch (refreshErr) {
      if (isAuthError(refreshErr)) {
        await logProviderEvent({
          workspaceId:  output.workspaceId,
          channelId:    output.channelId,
          platform:     'google_business_profile',
          eventType:    'refresh_failed',
          errorCode:    'token_expired',
          errorMessage: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        })
        throw Object.assign(
          new Error('Google session expired and could not be refreshed. Please reconnect your account.'),
          { code: 'token_expired', retryable: false }
        )
      }
      throw refreshErr
    }
  }

  // Fetch the canonical location resource path from the channel row
  const supabase = createServiceClient()
  const { data: channel } = await supabase
    .from('channels')
    .select('google_location_name')
    .eq('id', output.channelId)
    .single()

  if (!channel?.google_location_name) {
    throw Object.assign(
      new Error('Google location not found on this channel. Please reconnect.'),
      { code: 'missing_location', retryable: false }
    )
  }

  const content = output.content as OutputContent
  const summary = content.body?.trim() ?? ''
  if (!summary) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }
  if (summary.length > 1500) {
    throw Object.assign(
      new Error('Content exceeds Google Business Profile 1500 character limit.'),
      { code: 'content_too_long', retryable: false }
    )
  }

  const topicType: GBPPostTopicType =
    ((content as Record<string, unknown>).gbpTopicType as GBPPostTopicType | undefined) ?? 'STANDARD'

  const startedAt = Date.now()

  try {
    const response = await createLocalPost(channel.google_location_name, cred.accessToken, {
      summary,
      topicType,
    })

    const normalizedState = normalizeGBPPostState(response.state)
    const durationMs = Date.now() - startedAt

    await createPublishLog({
      workspaceId:    output.workspaceId,
      outputId:       output.id,
      channelId:      output.channelId,
      platform:       'google_business_profile',
      status:         normalizedState === 'published' ? 'success' : 'failed',
      providerPostId: response.name,
      wasRetry:       opts?.wasRetry ?? false,
      durationMs,
    })

    if (normalizedState === 'failed') {
      throw Object.assign(
        new Error('Google rejected this post. Check the content and try again.'),
        { code: 'moderation_rejection', retryable: false }
      )
    }

    return { postName: response.name }
  } catch (err) {
    if (err instanceof GBPApiError) {
      const durationMs = Date.now() - startedAt
      await createPublishLog({
        workspaceId:  output.workspaceId,
        outputId:     output.id,
        channelId:    output.channelId,
        platform:     'google_business_profile',
        status:       'failed',
        errorCode:    err.code,
        errorMessage: err.message,
        wasRetry:     opts?.wasRetry ?? false,
        durationMs,
      })
      throw Object.assign(err, { code: err.code, retryable: err.code === 'quota_exceeded' })
    }
    throw err
  }
}

// ─── Instagram ────────────────────────────────────────────────────────────────
// Instagram Content Publishing API requires an image. Text-only captions are
// written to the image caption field. A visual asset must be attached to the
// output (output.content.selectedVisualAssetId) to publish to Instagram.

export async function publishInstagramOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post.'),
      { code: 'no_channel', retryable: false }
    )
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('Instagram account not connected. Go to Channels and reconnect.'),
      { code: 'not_connected', retryable: false }
    )
  }

  const cred = credResult.data

  if (isTokenExpired(cred.expiresAt)) {
    throw Object.assign(
      new Error('Instagram session expired. Please reconnect your account.'),
      { code: 'token_expired', retryable: false }
    )
  }

  if (!cred.accountId) {
    throw Object.assign(
      new Error('Instagram account ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  const content = output.content as OutputContent
  const caption = [
    content.body?.trim() ?? '',
    ((content.hashtags as string[] | undefined) ?? []).map(h => `#${h}`).join(' '),
  ].filter(Boolean).join('\n').trim()

  if (!caption) {
    throw Object.assign(
      new Error('This draft has no content to post.'),
      { code: 'no_content', retryable: false }
    )
  }

  // Instagram requires a media URL — look up attached visual asset
  const visualAssetId = (output.content as OutputContent & { selectedVisualAssetId?: string }).selectedVisualAssetId
  if (!visualAssetId) {
    throw Object.assign(
      new Error('Instagram posts require an image. Attach a visual asset to this draft before publishing.'),
      { code: 'media_required', retryable: false }
    )
  }

  const supabase = createServiceClient()
  const { data: asset } = await supabase
    .from('visual_assets')
    .select('original_url')
    .eq('id', visualAssetId)
    .single()

  if (!asset?.original_url) {
    throw Object.assign(
      new Error('Visual asset not found or has no URL.'),
      { code: 'media_required', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postId: string

  try {
    const { id: creationId } = await createInstagramImageContainer(
      cred.accessToken,
      cred.accountId,
      asset.original_url,
      caption,
    )
    // Meta recommends a brief pause between container creation and publish
    await new Promise((resolve) => setTimeout(resolve, 500))
    const { id } = await publishInstagramContainer(cred.accessToken, cred.accountId, creationId)
    postId = id
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'instagram',
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
    platform:       'instagram',
    status:         'success',
    providerPostId: postId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId }
}

// ─── BlueSky ──────────────────────────────────────────────────────────────────

export async function publishBlueSkyOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a BlueSky channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('BlueSky account not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  // accountId holds the DID — used to restore the DPoP session from bluesky_oauth_sessions.
  // NOTE: access_token also contains the DID (as a NOT NULL sentinel), but we use
  // accountId here to make the intent clear. Real auth is via oauthClient.restore(did).
  const did = credResult.data.accountId
  if (!did) {
    throw Object.assign(
      new Error('BlueSky account ID missing. Please reconnect your account.'),
      { code: 'missing_account_id', retryable: false }
    )
  }

  const startedAt = Date.now()
  let postId: string

  try {
    const result = await postToBlueSky(did, output.content as OutputContent)
    postId = result.postId
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'bluesky',
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
    platform:       'bluesky',
    status:         'success',
    providerPostId: postId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId }
}

// ─── Mastodon ─────────────────────────────────────────────────────────────────

export async function publishMastodonOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ postId: string; postUrl: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a Mastodon channel.'),
      { code: 'no_channel', retryable: false }
    )
  }

  if (output.providerPostId) {
    return { postId: output.providerPostId, postUrl: output.providerPostUrl ?? output.providerPostId }
  }

  const credResult = await getChannelCredential(output.channelId)
  if (!credResult.ok) {
    throw Object.assign(
      new Error('Mastodon account not connected. Go to Channels and reconnect your account.'),
      { code: 'not_connected', retryable: false }
    )
  }

  const cred = credResult.data

  const supabase = createServiceClient()
  const { data: channelRow } = await supabase
    .from('channels')
    .select('config')
    .eq('id', output.channelId)
    .single()

  const config = (channelRow?.config ?? {}) as Record<string, unknown>
  const instanceUrl = config.instance_url as string | undefined
  if (!instanceUrl) {
    throw Object.assign(
      new Error('Mastodon instance URL missing. Please reconnect your account.'),
      { code: 'missing_instance_url', retryable: false }
    )
  }

  const charLimit = (config.char_limit as number | undefined) ?? 500
  const text = formatMastodonText(output.content as OutputContent, charLimit)

  if (!text) {
    throw Object.assign(
      new Error('Post content is empty.'),
      { code: 'no_content', retryable: false }
    )
  }

  const spoilerText = (output.content as Record<string, unknown>).spoilerText as string | undefined

  const startedAt = Date.now()
  let mastodonStatus: { id: string; url: string }

  try {
    mastodonStatus = await postToMastodon(instanceUrl, cred.accessToken, text, spoilerText)
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'mastodon',
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
    platform:       'mastodon',
    status:         'success',
    providerPostId: mastodonStatus.id,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { postId: mastodonStatus.id, postUrl: mastodonStatus.url }
}

// ─── Pinterest ────────────────────────────────────────────────────────────────
// Pinterest image Pins require a board, a durable public image, and a destination link.
// This publisher owns its createPublishLog calls (success + failure); the caller (post
// route / scheduled worker) owns acquirePublishLock + markPublished/markFailed + lock
// release. publishPinterestOutput itself is lock-free.

export async function publishPinterestOutput(
  output: Output,
  opts?: { wasRetry?: boolean }
): Promise<{ pinId: string }> {
  if (!output.channelId) {
    throw Object.assign(
      new Error('No channel assigned to this post. Edit the draft and assign a Pinterest account.'),
      { code: 'no_channel', retryable: false }
    )
  }

  // Idempotency: already published
  if (output.providerPostId) {
    return { pinId: output.providerPostId }
  }

  // Authoritative readiness — re-runs even if the UI already validated. Throws a
  // PinterestApiError carrying a readiness code (mapped to user copy by the caller).
  await assertPinterestReadiness(output)

  const accessToken = await getValidPinterestToken(output.channelId, output.workspaceId)
  const boardId = await resolveBoardForOutput(output)

  const image = await resolvePinterestImage(output)
  if (!image) {
    throw Object.assign(
      new Error('Pinterest Pins require an image.'),
      { code: 'missing_image', retryable: false }
    )
  }

  const canonicalUrl = resolvePinterestDestinationUrl({ output })
  const link = await tagPinterestDestination({ output, canonicalUrl })

  // Pinterest-native fields take priority over generic output.title / content.body.
  // Readiness (asserted above) already guarantees title + description resolve non-empty.
  const resolved = resolvePinterestText(output, { altText: image.altText })

  const startedAt = Date.now()
  let pinId: string

  try {
    const result = await createPin(accessToken, {
      boardId,
      imageUrl:    image.url,
      title:       resolved.title ?? '',
      description: resolved.description ?? '',
      link,
      altText:     resolved.altText ?? undefined,
      boardSectionId: resolved.boardSectionId ?? undefined,
    })
    pinId = result.pinId
  } catch (err) {
    const durationMs = Date.now() - startedAt
    await createPublishLog({
      workspaceId:  output.workspaceId,
      outputId:     output.id,
      channelId:    output.channelId,
      platform:     'pinterest',
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
    platform:       'pinterest',
    status:         'success',
    providerPostId: pinId,
    wasRetry:       opts?.wasRetry ?? false,
    durationMs,
  })

  return { pinId }
}
