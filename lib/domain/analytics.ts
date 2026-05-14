import type { ChannelPlatform, PerformanceSnapshot } from '@/types/domain'
import type { ChannelCredential } from '@/types/credentials'

export class InsufficientScopeError extends Error {
  constructor(public platform: ChannelPlatform) {
    super('insufficient_scope')
    this.name = 'InsufficientScopeError'
  }
}

export async function fetchPlatformAnalytics(params: {
  platform: ChannelPlatform
  providerPostId: string
  credentials: ChannelCredential
  channelAccountId: string | null
  channelAccountType: 'personal' | 'page' | 'business'
  existingSnapshot: PerformanceSnapshot | null
}): Promise<PerformanceSnapshot> {
  const { platform, providerPostId, credentials, channelAccountId, channelAccountType, existingSnapshot } = params

  switch (platform) {
    case 'twitter':
      return fetchTwitterAnalytics(providerPostId, credentials.accessToken, existingSnapshot)
    case 'linkedin':
      return fetchLinkedInAnalytics(providerPostId, credentials.accessToken, channelAccountId, channelAccountType, existingSnapshot)
    case 'threads':
      return fetchThreadsAnalytics(providerPostId, credentials.accessToken, existingSnapshot)
    case 'facebook':
      return fetchFacebookAnalytics(providerPostId, credentials.accessToken, existingSnapshot)
    case 'wordpress':
      return fetchWordPressAnalytics(providerPostId, channelAccountId, credentials, existingSnapshot)
    default:
      return {
        impressions: null,
        likes: null,
        comments: null,
        shares: null,
        providerPostUrl: existingSnapshot?.providerPostUrl ?? null,
        syncedAt: new Date().toISOString(),
      }
  }
}

async function fetchTwitterAnalytics(
  tweetId: string,
  accessToken: string,
  existing: PerformanceSnapshot | null,
): Promise<PerformanceSnapshot> {
  const res = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (res.status === 401 || res.status === 403) {
    throw new InsufficientScopeError('twitter')
  }
  if (!res.ok) {
    throw new Error(`Twitter API error: ${res.status}`)
  }

  const json = await res.json() as { data?: { public_metrics?: { impression_count?: number; like_count?: number; reply_count?: number; retweet_count?: number } } }
  const m = json.data?.public_metrics ?? {}

  return {
    impressions: m.impression_count ?? null,
    likes: m.like_count ?? null,
    comments: m.reply_count ?? null,
    shares: m.retweet_count ?? null,
    providerPostUrl: existing?.providerPostUrl ?? `https://x.com/i/web/status/${tweetId}`,
    syncedAt: new Date().toISOString(),
  }
}

async function fetchLinkedInAnalytics(
  postUrn: string,
  accessToken: string,
  orgUrn: string | null,
  accountType: 'personal' | 'page' | 'business',
  existing: PerformanceSnapshot | null,
): Promise<PerformanceSnapshot> {
  const encodedUrn = encodeURIComponent(postUrn)

  const actionsRes = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodedUrn}?projection=(likesSummary,commentsSummary)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    },
  )

  if (actionsRes.status === 401 || actionsRes.status === 403) {
    throw new InsufficientScopeError('linkedin')
  }
  if (!actionsRes.ok) {
    throw new Error(`LinkedIn API error: ${actionsRes.status}`)
  }

  const actionsJson = await actionsRes.json() as {
    likesSummary?: { totalLikes?: number }
    commentsSummary?: { totalFirstLevelComments?: number }
  }

  const likes = actionsJson.likesSummary?.totalLikes ?? null
  const comments = actionsJson.commentsSummary?.totalFirstLevelComments ?? null

  let impressions: number | null = null
  if ((accountType === 'page' || accountType === 'business') && orgUrn) {
    const statsRes = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(orgUrn)}&shares=List(${encodedUrn})`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    )
    if (statsRes.ok) {
      const statsJson = await statsRes.json() as { elements?: Array<{ totalShareStatistics?: { impressionCount?: number } }> }
      impressions = statsJson.elements?.[0]?.totalShareStatistics?.impressionCount ?? null
    }
  }

  return {
    impressions,
    likes,
    comments,
    shares: null,
    providerPostUrl: existing?.providerPostUrl ?? null,
    syncedAt: new Date().toISOString(),
  }
}

async function fetchThreadsAnalytics(
  mediaId: string,
  accessToken: string,
  existing: PerformanceSnapshot | null,
): Promise<PerformanceSnapshot> {
  const res = await fetch(
    `https://graph.threads.net/v1.0/${mediaId}/insights?metric=views,likes,replies,reposts,quotes`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (res.status === 401 || res.status === 403) {
    throw new InsufficientScopeError('threads')
  }
  if (!res.ok) {
    throw new Error(`Threads API error: ${res.status}`)
  }

  const json = await res.json() as { data?: Array<{ name: string; values?: Array<{ value: number }> }> }
  const metrics: Record<string, number> = {}
  for (const item of json.data ?? []) {
    metrics[item.name] = item.values?.[0]?.value ?? 0
  }

  return {
    impressions: metrics['views'] ?? null,
    likes: metrics['likes'] ?? null,
    comments: metrics['replies'] ?? null,
    shares: metrics['reposts'] ?? null,
    providerPostUrl: existing?.providerPostUrl ?? null,
    syncedAt: new Date().toISOString(),
  }
}

async function fetchFacebookAnalytics(
  postId: string,
  accessToken: string,
  existing: PerformanceSnapshot | null,
): Promise<PerformanceSnapshot> {
  const [insightsRes, postRes] = await Promise.all([
    fetch(
      `https://graph.facebook.com/v20.0/${postId}/insights?metric=post_impressions,post_reactions_like_total&access_token=${accessToken}`,
    ),
    fetch(
      `https://graph.facebook.com/v20.0/${postId}?fields=comments.summary(true)&access_token=${accessToken}`,
    ),
  ])

  if (insightsRes.status === 401 || insightsRes.status === 403) {
    throw new InsufficientScopeError('facebook')
  }

  let impressions: number | null = null
  let likes: number | null = null
  if (insightsRes.ok) {
    const insightsJson = await insightsRes.json() as { data?: Array<{ name: string; values?: Array<{ value: number }> }> }
    for (const item of insightsJson.data ?? []) {
      if (item.name === 'post_impressions') impressions = item.values?.[0]?.value ?? null
      if (item.name === 'post_reactions_like_total') likes = item.values?.[0]?.value ?? null
    }
  }

  let comments: number | null = null
  if (postRes.ok) {
    const postJson = await postRes.json() as { comments?: { summary?: { total_count?: number } } }
    comments = postJson.comments?.summary?.total_count ?? null
  }

  return {
    impressions,
    likes,
    comments,
    shares: null,
    providerPostUrl: existing?.providerPostUrl ?? `https://www.facebook.com/${postId}`,
    syncedAt: new Date().toISOString(),
  }
}

async function fetchWordPressAnalytics(
  postId: string,
  siteUrl: string | null,
  credentials: ChannelCredential,
  existing: PerformanceSnapshot | null,
): Promise<PerformanceSnapshot> {
  if (!siteUrl || !credentials.accountName) {
    return {
      impressions: null,
      likes: null,
      comments: null,
      shares: null,
      providerPostUrl: existing?.providerPostUrl ?? null,
      syncedAt: new Date().toISOString(),
    }
  }

  const authHeader = 'Basic ' + Buffer.from(`${credentials.accountName}:${credentials.accessToken}`).toString('base64')

  const res = await fetch(
    `${siteUrl}/wp-json/wp/v2/comments?post=${postId}&status=approve&per_page=1`,
    { headers: { Authorization: authHeader } },
  )

  let comments: number | null = null
  if (res.ok) {
    const total = res.headers.get('X-WP-Total')
    comments = total ? parseInt(total, 10) : null
  }

  return {
    impressions: null,
    likes: null,
    comments,
    shares: null,
    providerPostUrl: existing?.providerPostUrl ?? null,
    syncedAt: new Date().toISOString(),
  }
}
