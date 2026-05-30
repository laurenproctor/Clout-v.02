import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

// Twitter's public web-client bearer token — not a secret, embedded in twitter.com JS bundle.
// If requests start failing, check DevTools on twitter.com for the current value.
const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
// Update these constants when Twitter rotates GraphQL hashes (check DevTools on twitter.com)
const GQL_USER_BY_SCREEN_NAME = 'NimuplG1OB7Fd2btCLdBOw'
const GQL_USER_TWEETS         = 'V1ze5q3ijDS1VeLwLY0m7g'
const GQL_BASE = 'https://twitter.com/i/api/graphql'

function parseHandle(url: string): string | null {
  const parts = urlParts(url)
  const slug = parts[0]
  if (!slug || ['i', 'home', 'explore', 'search', 'intent', 'hashtag'].includes(slug)) return null
  return slug.replace(/^@/, '')
}

async function getGuestToken(): Promise<string | null> {
  const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${BEARER}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  return (await res.json())?.guest_token ?? null
}

function headers(guestToken: string) {
  return {
    Authorization:           `Bearer ${BEARER}`,
    'x-guest-token':         guestToken,
    'x-twitter-active-user': 'yes',
    'content-type':          'application/json',
  }
}

async function getUserId(handle: string, guestToken: string): Promise<string | null> {
  const vars = encodeURIComponent(JSON.stringify({ screen_name: handle, withSafetyModeUserFields: true }))
  const feats = encodeURIComponent(JSON.stringify({
    hidden_profile_likes_enabled: false,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    highlights_tweets_tab_ui_enabled: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
  }))
  const res = await fetch(
    `${GQL_BASE}/${GQL_USER_BY_SCREEN_NAME}/UserByScreenName?variables=${vars}&features=${feats}`,
    { headers: headers(guestToken), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) { console.warn(`[twitter] UserByScreenName ${res.status} — hashes may need updating`); return null }
  return (await res.json())?.data?.user?.result?.rest_id ?? null
}

interface RawTweet {
  rest_id: string
  legacy: { full_text: string; created_at: string; favorite_count: number; reply_count: number; retweet_count: number; retweeted_status_id_str?: string }
}

function extractTweets(data: unknown): RawTweet[] {
  const tweets: RawTweet[] = []
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.__typename === 'Tweet' && n.legacy && n.rest_id) tweets.push(n as unknown as RawTweet)
    for (const v of Object.values(n)) walk(v)
  }
  walk(data)
  return tweets
}

export async function scrapeTwitter(profileUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const handle = parseHandle(profileUrl)
  if (!handle) return []

  const guestToken = await getGuestToken()
  if (!guestToken) { console.warn('[twitter] Failed to get guest token'); return [] }

  const userId = await getUserId(handle, guestToken)
  if (!userId) return []

  const vars = encodeURIComponent(JSON.stringify({
    userId, count: opts.maxPosts ?? 10,
    includePromotedContent: false, withQuickPromoteEligibilityTweetFields: true,
    withVoice: true, withV2Timeline: true,
  }))
  const feats = encodeURIComponent(JSON.stringify({
    rweb_lists_timeline_redesign_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    longform_notetweets_rich_text_read_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  }))

  const res = await fetch(
    `${GQL_BASE}/${GQL_USER_TWEETS}/UserTweets?variables=${vars}&features=${feats}`,
    { headers: headers(guestToken), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) { console.warn(`[twitter] UserTweets ${res.status} — GQL hashes may need updating`); return [] }

  const raw = extractTweets(await res.json())
  return raw
    .filter(t => !t.legacy.retweeted_status_id_str)
    .slice(0, opts.maxPosts ?? 10)
    .map(t => ({
      external_id:  t.rest_id,
      content:      t.legacy.full_text.replace(/https?:\/\/t\.co\/\S+/g, '').trim(),
      url:          `https://twitter.com/${handle}/status/${t.rest_id}`,
      published_at: t.legacy.created_at ? new Date(t.legacy.created_at).toISOString() : new Date().toISOString(),
      metrics: {
        likes:    t.legacy.favorite_count,
        comments: t.legacy.reply_count,
        shares:   t.legacy.retweet_count,
      },
    }))
}
