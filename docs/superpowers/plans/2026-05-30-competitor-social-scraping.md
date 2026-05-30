# Competitor Social Post Scraping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape recent posts from competitor social accounts (YouTube, Twitter, Facebook, LinkedIn, Instagram) stored in `competitor_metadata.socials` and surface them in the Signal Intelligence Competitors tab.

**Architecture:** A set of per-platform HTTP scrapers in `lib/competitors/scrapers/` feeds an orchestrator that upserts to a new `competitor_social_posts` Supabase table. A new cron route fires every 6 hours; a new read route serves the UI. The Competitors tab gains a "From their socials" section using a new `CompetitorSocialPostCard`.

**Tech Stack:** Next.js App Router, Supabase (service client), Vitest, YouTube Data API v3, Twitter guest token API, mbasic.facebook.com HTML, LinkedIn Voyager API, Instagram private mobile API.

---

## File Map

**Create:**
- `lib/competitors/scrapers/types.ts` — shared `SocialPost` interface
- `lib/competitors/scrapers/youtube.ts` — YouTube Data API v3
- `lib/competitors/scrapers/twitter.ts` — guest token + GraphQL
- `lib/competitors/scrapers/facebook.ts` — mbasic.facebook.com HTML
- `lib/competitors/scrapers/linkedin.ts` — Voyager API
- `lib/competitors/scrapers/instagram.ts` — private mobile API
- `lib/competitors/__tests__/scrapers.test.ts` — unit tests for parse functions
- `lib/competitors/ingest-socials.ts` — ingestion orchestrator
- `app/api/admin/ingest-social-posts/route.ts` — cron + manual trigger
- `app/api/competitors/social-posts/route.ts` — read endpoint
- `components/feed/CompetitorSocialPostCard.tsx` — UI card

**Modify:**
- `vercel.json` — add 6-hour cron
- `components/feed/SignalFeed.tsx` — fetch + render social posts in Competitors tab

---

## Task 1: DB Migration

**Files:**
- Run SQL in Supabase dashboard (no migration file — project uses direct SQL)

- [ ] **Step 1: Run the migration in Supabase**

Open the Supabase SQL editor for this project and run:

```sql
create table if not exists competitor_social_posts (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  competitor_domain text not null,
  platform          text not null check (platform in ('youtube','twitter','instagram','linkedin','facebook')),
  post_id           text not null,
  content           text,
  url               text not null,
  thumbnail_url     text,
  published_at      timestamptz,
  fetched_at        timestamptz not null default now(),
  metrics           jsonb not null default '{}',
  unique (platform, post_id)
);

create index if not exists competitor_social_posts_workspace_published
  on competitor_social_posts (workspace_id, published_at desc);
```

- [ ] **Step 2: Verify**

In the Supabase Table Editor, confirm `competitor_social_posts` appears with all columns. Insert and delete a test row to confirm RLS doesn't block service-role access.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add competitor_social_posts table migration"
```

---

## Task 2: Shared Scraper Types

**Files:**
- Create: `lib/competitors/scrapers/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/competitors/scrapers/types.ts

export interface SocialPost {
  post_id:       string
  content:       string
  url:           string
  thumbnail_url?: string
  published_at:  string   // ISO 8601
  metrics: {
    likes?:    number
    comments?: number
    shares?:   number
    views?:    number
  }
}

export interface ScraperOpts {
  maxPosts?: number  // defaults to 10
}

/** Extract the path segments of a social URL, lower-cased, filtering blanks. */
export function urlParts(raw: string): string[] {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    return u.pathname.split('/').filter(Boolean)
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/types.ts
git commit -m "feat: add scraper shared types"
```

---

## Task 3: YouTube Scraper

**Files:**
- Create: `lib/competitors/scrapers/youtube.ts`

Requires `YOUTUBE_API_KEY` env var. Resolves a YouTube channel URL to a channel ID, fetches the uploads playlist, fetches video statistics in a single batch call.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/youtube.ts

import type { SocialPost, ScraperOpts } from './types'
import { urlParts } from './types'

const YT = 'https://www.googleapis.com/youtube/v3'

type ChannelRef =
  | { via: 'id';     value: string }
  | { via: 'handle'; value: string }
  | { via: 'user';   value: string }

function parseChannelUrl(url: string): ChannelRef | null {
  const parts = urlParts(url)
  if (!parts.length) return null
  if (parts[0] === 'channel' && parts[1]) return { via: 'id',     value: parts[1] }
  if (parts[0] === 'user'    && parts[1]) return { via: 'user',   value: parts[1] }
  if (parts[0]?.startsWith('@'))          return { via: 'handle', value: parts[0] }
  return null
}

async function resolveChannelId(ref: ChannelRef, apiKey: string): Promise<string | null> {
  if (ref.via === 'id') return ref.value
  const p = new URLSearchParams({ part: 'id', key: apiKey })
  if (ref.via === 'handle') p.set('forHandle', ref.value)
  if (ref.via === 'user')   p.set('forUsername', ref.value)
  const res = await fetch(`${YT}/channels?${p}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const d = await res.json()
  return d.items?.[0]?.id ?? null
}

export async function scrapeYouTube(channelUrl: string, opts: ScraperOpts = {}): Promise<SocialPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.warn('[youtube] YOUTUBE_API_KEY not set — skipping')
    return []
  }

  const ref = parseChannelUrl(channelUrl)
  if (!ref) return []

  const channelId = await resolveChannelId(ref, apiKey)
  if (!channelId) return []

  // Get uploads playlist ID
  const chanRes = await fetch(
    `${YT}/channels?${new URLSearchParams({ part: 'contentDetails', id: channelId, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!chanRes.ok) return []
  const chanData = await chanRes.json()
  const uploadsId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  // Fetch playlist items
  const maxResults = String(opts.maxPosts ?? 10)
  const plRes = await fetch(
    `${YT}/playlistItems?${new URLSearchParams({ part: 'snippet', playlistId: uploadsId, maxResults, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!plRes.ok) return []
  const plData = await plRes.json()
  const items: Array<{
    snippet: {
      resourceId: { videoId: string }
      title: string
      publishedAt: string
      thumbnails: { medium?: { url: string }; default?: { url: string } }
    }
  }> = plData.items ?? []
  if (!items.length) return []

  // Batch-fetch statistics
  const videoIds = items.map(i => i.snippet.resourceId.videoId).join(',')
  const statsRes = await fetch(
    `${YT}/videos?${new URLSearchParams({ part: 'statistics', id: videoIds, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  const statsMap: Record<string, { viewCount?: string; likeCount?: string; commentCount?: string }> = {}
  if (statsRes.ok) {
    const statsData = await statsRes.json()
    for (const v of statsData.items ?? []) statsMap[v.id] = v.statistics
  }

  return items.map(item => {
    const videoId = item.snippet.resourceId.videoId
    const s = statsMap[videoId] ?? {}
    return {
      post_id:       videoId,
      content:       item.snippet.title,
      url:           `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
      published_at:  item.snippet.publishedAt,
      metrics: {
        views:    s.viewCount    ? parseInt(s.viewCount)    : undefined,
        likes:    s.likeCount    ? parseInt(s.likeCount)    : undefined,
        comments: s.commentCount ? parseInt(s.commentCount) : undefined,
      },
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/youtube.ts
git commit -m "feat: add YouTube scraper"
```

---

## Task 4: Twitter Scraper

**Files:**
- Create: `lib/competitors/scrapers/twitter.ts`

Uses Twitter's own internal guest API. No credentials needed. The two `GQL_*` hash constants must be updated if Twitter rotates them — find current values by opening twitter.com, opening DevTools → Network, filtering for `UserByScreenName` or `UserTweets`, and copying the hash from the request URL.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/twitter.ts

import type { SocialPost, ScraperOpts } from './types'
import { urlParts } from './types'

// Twitter's public web-app bearer token (rotates rarely — update if 403s appear)
const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

// GraphQL operation hashes — find current values in DevTools Network tab on twitter.com
// Filter by "UserByScreenName" or "UserTweets" to get the path with the hash
const GQL_USER_BY_SCREEN_NAME = 'NimuplG1OB7Fd2btCLdBOw'
const GQL_USER_TWEETS         = 'V1ze5q3ijDS1VeLwLY0m7g'

const GQL_BASE = 'https://twitter.com/i/api/graphql'

function parseHandle(url: string): string | null {
  const parts = urlParts(url)
  const slug = parts[0]
  if (!slug || slug.startsWith('i') || slug === 'home' || slug === 'explore') return null
  return slug.replace(/^@/, '')
}

async function getGuestToken(): Promise<string | null> {
  const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
    method:  'POST',
    headers: { Authorization: `Bearer ${BEARER}` },
    signal:  AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const d = await res.json()
  return d.guest_token ?? null
}

function twitterHeaders(guestToken: string) {
  return {
    Authorization:  `Bearer ${BEARER}`,
    'x-guest-token': guestToken,
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json',
  }
}

async function getUserId(handle: string, guestToken: string): Promise<string | null> {
  const variables = encodeURIComponent(JSON.stringify({
    screen_name: handle,
    withSafetyModeUserFields: true,
  }))
  const features = encodeURIComponent(JSON.stringify({
    hidden_profile_likes_enabled: false,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    highlights_tweets_tab_ui_enabled: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
  }))

  const res = await fetch(
    `${GQL_BASE}/${GQL_USER_BY_SCREEN_NAME}/UserByScreenName?variables=${variables}&features=${features}`,
    { headers: twitterHeaders(guestToken), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) {
    console.warn(`[twitter] UserByScreenName failed for @${handle}: ${res.status}`)
    return null
  }
  const d = await res.json()
  return d?.data?.user?.result?.rest_id ?? null
}

interface RawTweet {
  rest_id: string
  legacy: {
    full_text:         string
    created_at:        string
    favorite_count:    number
    reply_count:       number
    retweet_count:     number
    retweeted_status_id_str?: string
  }
}

function extractTweets(data: unknown): RawTweet[] {
  const tweets: RawTweet[] = []
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.__typename === 'Tweet' && n.legacy && n.rest_id) {
      tweets.push(n as unknown as RawTweet)
    }
    for (const v of Object.values(n)) walk(v)
  }
  walk(data)
  return tweets
}

export async function scrapeTwitter(profileUrl: string, opts: ScraperOpts = {}): Promise<SocialPost[]> {
  const handle = parseHandle(profileUrl)
  if (!handle) return []

  const guestToken = await getGuestToken()
  if (!guestToken) {
    console.warn('[twitter] Failed to get guest token')
    return []
  }

  const userId = await getUserId(handle, guestToken)
  if (!userId) return []

  const variables = encodeURIComponent(JSON.stringify({
    userId,
    count: opts.maxPosts ?? 10,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true,
  }))
  const features = encodeURIComponent(JSON.stringify({
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
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    longform_notetweets_rich_text_read_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  }))

  const res = await fetch(
    `${GQL_BASE}/${GQL_USER_TWEETS}/UserTweets?variables=${variables}&features=${features}`,
    { headers: twitterHeaders(guestToken), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) {
    console.warn(`[twitter] UserTweets failed for @${handle}: ${res.status}. GQL hashes may need updating.`)
    return []
  }

  const data = await res.json()
  const rawTweets = extractTweets(data)

  return rawTweets
    .filter(t => !t.legacy.retweeted_status_id_str)  // skip retweets
    .slice(0, opts.maxPosts ?? 10)
    .map(t => ({
      post_id:      t.rest_id,
      content:      t.legacy.full_text.replace(/https?:\/\/t\.co\/\S+/g, '').trim(),
      url:          `https://twitter.com/${handle}/status/${t.rest_id}`,
      published_at: new Date(t.legacy.created_at).toISOString(),
      metrics: {
        likes:    t.legacy.favorite_count,
        comments: t.legacy.reply_count,
        shares:   t.legacy.retweet_count,
      },
    }))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/twitter.ts
git commit -m "feat: add Twitter guest-token scraper"
```

---

## Task 5: Facebook Scraper

**Files:**
- Create: `lib/competitors/scrapers/facebook.ts`

Fetches `mbasic.facebook.com/{slug}` — Facebook's plain-HTML mobile-basic site. No auth required for public Pages.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/facebook.ts

import type { SocialPost, ScraperOpts } from './types'
import { urlParts } from './types'

function parsePageSlug(url: string): string | null {
  const parts = urlParts(url)
  const slug = parts[0]
  const blocked = new Set(['sharer', 'dialog', 'login', 'signup', 'photo', 'video', 'share', 'events', 'groups'])
  if (!slug || blocked.has(slug)) return null
  return slug
}

/** Parse post text nodes from mbasic HTML. */
export function parseMbasicPosts(html: string, pageSlug: string): Array<{
  post_id: string; content: string; url: string; published_at: string; likes: number; comments: number
}> {
  const posts: Array<{ post_id: string; content: string; url: string; published_at: string; likes: number; comments: number }> = []

  // mbasic story links: href="/story.php?story_fbid=XXX&id=YYY"
  const storyRegex = /href="\/story\.php\?story_fbid=(\d+)(?:&amp;|&)id=(\d+)"[^>]*>(?:See|View) (?:full )?(?:story|post|more)<\/a>/gi
  const storyMatches = [...html.matchAll(storyRegex)]

  if (storyMatches.length === 0) return posts

  // Split HTML by story boundaries
  const storyIds = storyMatches.map(m => ({ fbid: m[1], id: m[2], index: m.index ?? 0 }))

  for (let i = 0; i < storyIds.length; i++) {
    const { fbid, id, index } = storyIds[i]
    const nextIndex = storyIds[i + 1]?.index ?? html.length
    const chunk = html.slice(Math.max(0, index - 3000), nextIndex)

    // Extract post text — look for paragraphs of plain text in the chunk
    const textMatches = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    const content = textMatches
      .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim())
      .filter(t => t.length > 20)
      .join(' ')
      .slice(0, 500)

    if (!content) continue

    // Extract timestamp from <abbr> or data-store attribute
    const abbrMatch = chunk.match(/<abbr[^>]*data-store="([^"]+)"/)
    const timestampMs = abbrMatch ? (() => {
      try { return JSON.parse(decodeURIComponent(abbrMatch[1])).time * 1000 } catch { return null }
    })() : null
    const published_at = timestampMs ? new Date(timestampMs).toISOString() : new Date().toISOString()

    // Extract reaction count
    const likesMatch = chunk.match(/(\d[\d,]*)\s*(?:people\s+)?(?:reacted|likes?)/i)
    const commentMatch = chunk.match(/(\d[\d,]*)\s*comments?/i)
    const likes    = likesMatch   ? parseInt(likesMatch[1].replace(/,/g, ''))   : 0
    const comments = commentMatch ? parseInt(commentMatch[1].replace(/,/g, '')) : 0

    posts.push({
      post_id:      fbid,
      content,
      url:          `https://www.facebook.com/story.php?story_fbid=${fbid}&id=${id}`,
      published_at,
      likes,
      comments,
    })
  }

  return posts
}

export async function scrapeFacebook(pageUrl: string, opts: ScraperOpts = {}): Promise<SocialPost[]> {
  const slug = parsePageSlug(pageUrl)
  if (!slug) return []

  const res = await fetch(`https://mbasic.facebook.com/${slug}`, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []

  const html = await res.text()
  const parsed = parseMbasicPosts(html, slug)

  return parsed.slice(0, opts.maxPosts ?? 10).map(p => ({
    post_id:      p.post_id,
    content:      p.content,
    url:          p.url,
    published_at: p.published_at,
    metrics: {
      likes:    p.likes    || undefined,
      comments: p.comments || undefined,
    },
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/facebook.ts
git commit -m "feat: add Facebook mbasic scraper"
```

---

## Task 6: LinkedIn Scraper

**Files:**
- Create: `lib/competitors/scrapers/linkedin.ts`

Requires `LINKEDIN_LI_AT` env var (LinkedIn session cookie). Makes an initial request to fetch the `JSESSIONID` cookie (needed for CSRF token), then calls the Voyager API.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/linkedin.ts

import type { SocialPost, ScraperOpts } from './types'
import { urlParts } from './types'

function parseCompanySlug(url: string): string | null {
  const parts = urlParts(url)
  if (parts[0] === 'company' && parts[1]) return parts[1]
  return null
}

async function getJsessionId(liAt: string): Promise<string | null> {
  const res = await fetch('https://www.linkedin.com/feed/', {
    headers: {
      Cookie:           `li_at=${liAt}`,
      'User-Agent':     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  })

  const cookies = res.headers.getSetCookie?.() ?? []
  for (const c of cookies) {
    const m = c.match(/JSESSIONID="?ajax:([^";]+)"?/)
    if (m) return `ajax:${m[1]}`
  }
  // Fall back to a fixed value — works for read-only Voyager calls when strict CSRF is off
  return 'ajax:0685672062'
}

function voyagerHeaders(liAt: string, csrfToken: string) {
  return {
    Cookie:                        `li_at=${liAt}; JSESSIONID="${csrfToken}"`,
    'csrf-token':                  csrfToken,
    'x-restli-protocol-version':   '2.0.0',
    'x-li-lang':                   'en_US',
    'x-li-page-instance':          'urn:li:page:d_flagship3_company;AAAA',
    'User-Agent':                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    Accept:                        'application/vnd.linkedin.normalized+json+2.1',
  }
}

async function resolveCompanyId(slug: string, liAt: string, csrfToken: string): Promise<string | null> {
  const url = `https://www.linkedin.com/voyager/api/organization/companies?q=universalName&universalName=${encodeURIComponent(slug)}`
  const res = await fetch(url, {
    headers: voyagerHeaders(liAt, csrfToken),
    signal:  AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const d = await res.json()
  const entity = d?.elements?.[0] ?? d?.included?.[0]
  const urn: string = entity?.entityUrn ?? entity?.['*elements']?.[0] ?? ''
  const m = urn.match(/urn:li:company:(\d+)/)
  return m?.[1] ?? null
}

interface VoyagerUpdate {
  updateContent?: {
    companyStatusUpdate?: {
      updateV2?: {
        text?: { text?: string }
        media?: { thumbnail?: { url?: string } }
      }
    }
  }
  socialDetail?: {
    likes?:      { paging?: { total?: number } }
    comments?:   { paging?: { total?: number } }
  }
  created?: { time?: number }
  permalink?: string
}

export async function scrapeLinkedIn(companyUrl: string, opts: ScraperOpts = {}): Promise<SocialPost[]> {
  const liAt = process.env.LINKEDIN_LI_AT
  if (!liAt) {
    console.warn('[linkedin] LINKEDIN_LI_AT not set — skipping')
    return []
  }

  const slug = parseCompanySlug(companyUrl)
  if (!slug) return []

  const csrfToken = await getJsessionId(liAt)
  if (!csrfToken) return []

  const companyId = await resolveCompanyId(slug, liAt, csrfToken)
  if (!companyId) {
    console.warn(`[linkedin] Could not resolve company ID for ${slug}`)
    return []
  }

  const count = opts.maxPosts ?? 10
  const feedUrl = `https://www.linkedin.com/voyager/api/feed/updatesV2?companyId=${companyId}&q=companyFeedByUniversalName&count=${count}&start=0`

  const res = await fetch(feedUrl, {
    headers: voyagerHeaders(liAt, csrfToken),
    signal:  AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    console.warn(`[linkedin] Feed fetch failed for ${slug}: ${res.status}`)
    return []
  }

  const d = await res.json()
  const updates: VoyagerUpdate[] = d?.elements ?? d?.data?.elements ?? []

  return updates
    .slice(0, count)
    .map((u, i) => {
      const text    = u.updateContent?.companyStatusUpdate?.updateV2?.text?.text ?? ''
      const thumb   = u.updateContent?.companyStatusUpdate?.updateV2?.media?.thumbnail?.url
      const time    = u.created?.time
      const likes   = u.socialDetail?.likes?.paging?.total
      const comments = u.socialDetail?.comments?.paging?.total
      const link    = u.permalink ?? `https://www.linkedin.com/company/${slug}/posts/`

      return {
        post_id:       u.permalink ?? `${companyId}-${i}-${time ?? Date.now()}`,
        content:       text.slice(0, 500),
        url:           link,
        thumbnail_url: thumb,
        published_at:  time ? new Date(time).toISOString() : new Date().toISOString(),
        metrics: {
          likes:    likes    ?? undefined,
          comments: comments ?? undefined,
        },
      }
    })
    .filter(p => p.content.length > 0)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/linkedin.ts
git commit -m "feat: add LinkedIn Voyager scraper"
```

---

## Task 7: Instagram Scraper

**Files:**
- Create: `lib/competitors/scrapers/instagram.ts`

Uses Instagram's private mobile API. Works for public accounts without auth. `INSTAGRAM_SESSION_ID` env var improves reliability for accounts that require login.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/instagram.ts

import type { SocialPost, ScraperOpts } from './types'
import { urlParts } from './types'

const IG_APP_ID = '936619743392459'
const IG_BASE   = 'https://i.instagram.com/api/v1'

function parseHandle(url: string): string | null {
  const parts = urlParts(url)
  const slug = parts[0]
  const blocked = new Set(['p', 'explore', 'reel', 'reels', 'stories', 'tv', 'accounts', 'direct'])
  if (!slug || blocked.has(slug)) return null
  return slug.replace(/^@/, '')
}

function igHeaders(sessionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent':  'Instagram 276.0.0.21.105 Android (30/11; 420dpi; 1080x2280; samsung; SM-G991B; o1s; exynos2100; en_US; 453743458)',
    'x-ig-app-id': IG_APP_ID,
    Accept:        '*/*',
  }
  if (sessionId) headers.Cookie = `sessionid=${sessionId}`
  return headers
}

async function resolveUserId(handle: string, sessionId?: string): Promise<string | null> {
  const res = await fetch(
    `${IG_BASE}/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    { headers: igHeaders(sessionId), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  const d = await res.json()
  return d?.data?.user?.id ?? null
}

interface IGMedia {
  id:            string
  caption?:      { text?: string }
  timestamp:     number
  like_count?:   number
  comment_count?: number
  image_versions2?: { candidates?: Array<{ url: string }> }
  carousel_media?: Array<{ image_versions2?: { candidates?: Array<{ url: string }> } }>
  code?: string
}

export async function scrapeInstagram(profileUrl: string, opts: ScraperOpts = {}): Promise<SocialPost[]> {
  const handle   = parseHandle(profileUrl)
  if (!handle) return []

  const sessionId = process.env.INSTAGRAM_SESSION_ID

  const userId = await resolveUserId(handle, sessionId)
  if (!userId) {
    console.warn(`[instagram] Could not resolve user ID for @${handle}`)
    return []
  }

  const count = opts.maxPosts ?? 10
  const res = await fetch(
    `${IG_BASE}/feed/user/${userId}/?count=${count}`,
    { headers: igHeaders(sessionId), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) {
    console.warn(`[instagram] Feed fetch failed for @${handle}: ${res.status}`)
    return []
  }

  const d = await res.json()
  const items: IGMedia[] = d?.items ?? []

  return items.slice(0, count).map(item => {
    const thumb =
      item.image_versions2?.candidates?.[0]?.url ??
      item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url

    const shortcode = item.code ?? item.id

    return {
      post_id:       item.id,
      content:       (item.caption?.text ?? '').slice(0, 500),
      url:           `https://www.instagram.com/p/${shortcode}/`,
      thumbnail_url: thumb,
      published_at:  new Date(item.timestamp * 1000).toISOString(),
      metrics: {
        likes:    item.like_count    ?? undefined,
        comments: item.comment_count ?? undefined,
      },
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/instagram.ts
git commit -m "feat: add Instagram private API scraper"
```

---

## Task 8: Unit Tests for Parse Functions

**Files:**
- Create: `lib/competitors/__tests__/scrapers.test.ts`

Tests cover the pure parsing/extraction functions that don't make HTTP calls.

- [ ] **Step 1: Create the test file**

```typescript
// lib/competitors/__tests__/scrapers.test.ts

import { describe, it, expect } from 'vitest'
import { urlParts } from '../scrapers/types'
import { parseMbasicPosts } from '../scrapers/facebook'

describe('urlParts', () => {
  it('extracts path parts from a full URL', () => {
    expect(urlParts('https://twitter.com/TechCrunch')).toEqual(['TechCrunch'])
  })

  it('extracts path parts from a URL without protocol', () => {
    expect(urlParts('linkedin.com/company/stripe')).toEqual(['company', 'stripe'])
  })

  it('returns empty array for invalid URL', () => {
    expect(urlParts('not a url at all %%')).toEqual([])
  })

  it('filters empty segments', () => {
    expect(urlParts('https://youtube.com/@techcrunch')).toEqual(['@techcrunch'])
  })
})

describe('parseMbasicPosts', () => {
  it('returns empty array for HTML with no story permalinks', () => {
    expect(parseMbasicPosts('<html><body>nothing here</body></html>', 'testpage')).toEqual([])
  })

  it('extracts post_id and url from story permalink', () => {
    const html = `
      <p>Some post content that is longer than twenty characters for sure</p>
      <a href="/story.php?story_fbid=123456&amp;id=789">See full story</a>
    `
    const posts = parseMbasicPosts(html, 'testpage')
    expect(posts).toHaveLength(1)
    expect(posts[0].post_id).toBe('123456')
    expect(posts[0].url).toContain('story_fbid=123456')
  })

  it('parses reaction counts from text', () => {
    const html = `
      <p>Exciting announcement that is more than 20 characters long here</p>
      <span>42 people reacted</span>
      <a href="/story.php?story_fbid=999&amp;id=111">See full story</a>
      <span>7 comments</span>
    `
    const posts = parseMbasicPosts(html, 'testpage')
    expect(posts[0].likes).toBe(42)
    expect(posts[0].comments).toBe(7)
  })

  it('skips chunks with no extractable content', () => {
    const html = `
      <a href="/story.php?story_fbid=111&amp;id=222">See full story</a>
    `
    expect(parseMbasicPosts(html, 'testpage')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they pass**

```bash
npx vitest run lib/competitors/__tests__/scrapers.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/competitors/__tests__/scrapers.test.ts
git commit -m "test: add scraper parse function unit tests"
```

---

## Task 9: Ingestion Orchestrator

**Files:**
- Create: `lib/competitors/ingest-socials.ts`

- [ ] **Step 1: Create the orchestrator**

```typescript
// lib/competitors/ingest-socials.ts

import { createServiceClient } from '@/lib/supabase/service'
import { scrapeYouTube }   from './scrapers/youtube'
import { scrapeTwitter }   from './scrapers/twitter'
import { scrapeFacebook }  from './scrapers/facebook'
import { scrapeLinkedIn }  from './scrapers/linkedin'
import { scrapeInstagram } from './scrapers/instagram'
import type { SocialPost } from './scrapers/types'
import type { CompetitorMetadata } from '@/types/feed'

type Platform = 'youtube' | 'twitter' | 'linkedin' | 'instagram' | 'facebook'

const SCRAPERS: Record<Platform, (url: string) => Promise<SocialPost[]>> = {
  youtube:   url => scrapeYouTube(url),
  twitter:   url => scrapeTwitter(url),
  facebook:  url => scrapeFacebook(url),
  linkedin:  url => scrapeLinkedIn(url),
  instagram: url => scrapeInstagram(url),
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export interface IngestSocialsResult {
  scraped:  number
  inserted: number
  skipped:  number
  errors:   string[]
}

export async function ingestSocials(): Promise<IngestSocialsResult> {
  const supabase = createServiceClient()
  const result: IngestSocialsResult = { scraped: 0, inserted: 0, skipped: 0, errors: [] }

  // Fetch all workspaces with competitor social data
  const { data: rows, error } = await supabase
    .from('workspace_feed_settings')
    .select('workspace_id, competitors, competitor_metadata')
    .not('competitor_metadata', 'is', null)

  if (error) {
    result.errors.push(`Failed to fetch workspaces: ${error.message}`)
    return result
  }

  for (const row of rows ?? []) {
    const { workspace_id, competitors, competitor_metadata } = row
    const metadata = (competitor_metadata ?? {}) as CompetitorMetadata
    const domains: string[] = (competitors ?? []).slice(0, 5) // cap at 5 per workspace per run

    for (const domain of domains) {
      const socials = metadata[domain]?.socials ?? {}

      for (const [platform, url] of Object.entries(socials) as [Platform, string][]) {
        if (!url || !SCRAPERS[platform]) continue

        try {
          await delay(1500) // rate limit between requests
          const posts = await SCRAPERS[platform](url)
          result.scraped += posts.length

          for (const post of posts) {
            const { error: upsertError } = await supabase
              .from('competitor_social_posts')
              .upsert(
                {
                  workspace_id,
                  competitor_domain: domain,
                  platform,
                  post_id:       post.post_id,
                  content:       post.content,
                  url:           post.url,
                  thumbnail_url: post.thumbnail_url ?? null,
                  published_at:  post.published_at,
                  fetched_at:    new Date().toISOString(),
                  metrics:       post.metrics,
                },
                { onConflict: 'platform,post_id' }
              )

            if (upsertError) {
              result.errors.push(`Upsert failed [${platform}/${post.post_id}]: ${upsertError.message}`)
            } else {
              result.inserted++
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.errors.push(`Scrape failed [${platform}/${domain}]: ${msg}`)
          result.skipped++
        }
      }
    }
  }

  return result
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/ingest-socials.ts
git commit -m "feat: add social post ingestion orchestrator"
```

---

## Task 10: Cron API Route + vercel.json

**Files:**
- Create: `app/api/admin/ingest-social-posts/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the API route**

```typescript
// app/api/admin/ingest-social-posts/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { ingestSocials } from '@/lib/competitors/ingest-socials'

function isAuthorized(req: NextRequest): boolean {
  if (req.method === 'GET') {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return false
    return req.headers.get('authorization') === `Bearer ${cronSecret}`
  }
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  return req.headers.get('x-admin-secret') === adminSecret
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await ingestSocials()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await ingestSocials()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Add the cron to vercel.json**

Current `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/ingest-signals",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Updated `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/ingest-signals",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/admin/ingest-social-posts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ingest-social-posts/route.ts vercel.json
git commit -m "feat: add ingest-social-posts cron route"
```

---

## Task 11: Read API Route

**Files:**
- Create: `app/api/competitors/social-posts/route.ts`

- [ ] **Step 1: Create the read route**

```typescript
// app/api/competitors/social-posts/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = req.nextUrl.searchParams.get('platform')

  const supabase = await createClient()
  let query = supabase
    .from('competitor_social_posts')
    .select('*')
    .eq('workspace_id', session.workspaceId)
    .order('published_at', { ascending: false })
    .limit(50)

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  return NextResponse.json({ posts: data ?? [] })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/competitors/social-posts/route.ts
git commit -m "feat: add competitors social-posts read API"
```

---

## Task 12: CompetitorSocialPostCard Component

**Files:**
- Create: `components/feed/CompetitorSocialPostCard.tsx`

- [ ] **Step 1: Create the card component**

```tsx
// components/feed/CompetitorSocialPostCard.tsx

'use client'

import { tokens } from '@/lib/feed/tokens'

interface SocialPost {
  id:                string
  competitor_domain: string
  platform:          'youtube' | 'twitter' | 'instagram' | 'linkedin' | 'facebook'
  content:           string
  url:               string
  thumbnail_url?:    string | null
  published_at?:     string | null
  metrics?:          { likes?: number; comments?: number; shares?: number; views?: number } | null
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube:   'YouTube',
  twitter:   'X / Twitter',
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube:   '#FF0000',
  twitter:   '#000000',
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
  facebook:  '#1877F2',
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      padding:         '2px 7px',
      borderRadius:    '10px',
      fontSize:        '10px',
      fontWeight:      700,
      textTransform:   'uppercase',
      letterSpacing:   '0.6px',
      backgroundColor: `${PLATFORM_COLORS[platform]}18`,
      color:           PLATFORM_COLORS[platform] ?? '#6b7280',
      border:          `1px solid ${PLATFORM_COLORS[platform]}30`,
    }}>
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  )
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days < 30)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function CompetitorSocialPostCard({ post }: { post: SocialPost }) {
  const m = post.metrics ?? {}
  const metricParts: string[] = []
  if (m.likes    != null) metricParts.push(`${fmt(m.likes)} likes`)
  if (m.comments != null) metricParts.push(`${fmt(m.comments)} comments`)
  if (m.shares   != null) metricParts.push(`${fmt(m.shares)} shares`)
  if (m.views    != null) metricParts.push(`${fmt(m.views)} views`)

  return (
    <div style={{
      border:          `1px solid ${tokens.colors.cardBorder ?? '#e5e7eb'}`,
      borderRadius:    '8px',
      backgroundColor: '#fff',
      marginBottom:    '12px',
      overflow:        'hidden',
    }}>
      {/* Thumbnail */}
      {post.thumbnail_url && (
        <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.thumbnail_url}
            alt=""
            style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
          />
        </a>
      )}

      <div style={{ padding: '12px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${post.competitor_domain}&sz=16`}
            width={14}
            height={14}
            alt=""
            style={{ borderRadius: '2px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {post.competitor_domain}
          </span>
          <PlatformBadge platform={post.platform} />
          {post.published_at && (
            <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>
              {relativeTime(post.published_at)}
            </span>
          )}
        </div>

        {/* Content */}
        <p style={{
          fontSize:   '13px',
          color:      '#111827',
          lineHeight: '1.5',
          margin:     '0 0 10px',
          display:    '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow:   'hidden',
        }}>
          {post.content || '(no text)'}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          {metricParts.length > 0 && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {metricParts.join(' · ')}
            </span>
          )}
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize:       '11px',
              fontWeight:     600,
              color:          '#4f46e5',
              textDecoration: 'none',
              marginLeft:     'auto',
            }}
          >
            View post →
          </a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/feed/CompetitorSocialPostCard.tsx
git commit -m "feat: add CompetitorSocialPostCard UI component"
```

---

## Task 13: SignalFeed Integration

**Files:**
- Modify: `components/feed/SignalFeed.tsx`

Wire up the social posts fetch and render the new "From their socials" section in the Competitors tab. Four targeted edits to the existing file.

- [ ] **Step 1: Add the import**

At the top of `components/feed/SignalFeed.tsx`, after the existing `CompetitorPostCard` import, add:

```tsx
import { CompetitorSocialPostCard } from './CompetitorSocialPostCard'
```

- [ ] **Step 2: Add state for social posts**

In `SignalFeed`, after the existing `const [competitorPostCache, setCompetitorPostCache] = useState<CompetitorPostCache>(null)` line, add:

```tsx
const [socialPostCache, setSocialPostCache] = useState<Array<{
  id: string; competitor_domain: string; platform: 'youtube'|'twitter'|'instagram'|'linkedin'|'facebook'
  content: string; url: string; thumbnail_url?: string|null; published_at?: string|null
  metrics?: { likes?: number; comments?: number; shares?: number; views?: number } | null
}> | null>(null)
```

- [ ] **Step 3: Fetch social posts alongside existing competitor data**

In `fetchTab`, inside the `if (tab === 'competitors')` branch, add the social posts fetch alongside the existing two fetches:

```tsx
const [signalsRes, postsRes, socialsRes] = await Promise.all([
  fetch('/api/competitors/signals'),
  fetch('/api/competitors/posts'),
  fetch('/api/competitors/social-posts'),
])
if (!signalsRes.ok) throw new Error('Failed to load competitive landscape')
const { competitors } = await signalsRes.json()
setCompetitorCache(competitors ?? [])
if (postsRes.ok) {
  const { posts } = await postsRes.json()
  setCompetitorPostCache(posts ?? [])
}
if (socialsRes.ok) {
  const { posts } = await socialsRes.json()
  setSocialPostCache(posts ?? [])
}
```

Replace the existing two-fetch `Promise.all` in the competitors branch with this three-fetch version.

- [ ] **Step 4: Cache check — include socialPostCache in isEmpty**

Find the `isEmpty` computation. Update the competitors case to also check `socialPostCache`:

```tsx
const isEmpty = activeTab === 'competitors'
  ? (!activeCompetitors || activeCompetitors.length === 0)
    && (!activeCompetitorPosts || activeCompetitorPosts.length === 0)
    && (!socialPostCache || socialPostCache.length === 0)
  : !activeCards || activeCards.length === 0
```

- [ ] **Step 5: Render the "From their socials" section**

Find the existing "From their channels" blog posts section (it starts with the `<div style={{ marginBottom: '12px' }}>` containing `"From their channels"`). Insert the social posts section immediately after it and before the existing signal tracking section:

```tsx
{/* From their socials */}
{!loading && !error && !isEmpty && activeTab === 'competitors' && socialPostCache && socialPostCache.length > 0 && (
  <>
    <div style={{ marginBottom: '12px', marginTop: activeCompetitorPosts?.length ? '20px' : '0' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9ca3af' }}>
        From their socials
      </span>
    </div>
    {socialPostCache.map((post, index) => (
      <div
        key={post.id}
        style={{ animation: 'feedCardEnter 0.35s ease both', animationDelay: `${(activeCompetitorPosts?.length ?? 0) * 60 + index * 60}ms` }}
      >
        <CompetitorSocialPostCard post={post} />
      </div>
    ))}
  </>
)}
```

- [ ] **Step 6: Run the dev server and verify**

```bash
npm run dev
```

Open the Signal Intelligence feed → Competitors tab. Confirm:
- "From their socials" section header appears (may be empty until the cron runs or you manually trigger ingestion)
- Existing "From their channels" and "Signal tracking" sections still render correctly
- No TypeScript errors in the terminal

- [ ] **Step 7: Commit**

```bash
git add components/feed/SignalFeed.tsx
git commit -m "feat: wire social posts into Signal Intelligence Competitors tab"
```

---

## Task 14: Environment Variables

Add to Vercel environment variables (Settings → Environment Variables):

| Variable | Value | Required for |
|---|---|---|
| `YOUTUBE_API_KEY` | Google Cloud Console → APIs & Services → Credentials | YouTube posts |
| `LINKEDIN_LI_AT` | Copy `li_at` cookie value from LinkedIn in browser DevTools | LinkedIn posts |
| `INSTAGRAM_SESSION_ID` | Copy `sessionid` cookie value from Instagram in browser DevTools | Instagram reliability |

`CRON_SECRET` and `ADMIN_SECRET` already exist.

- [ ] **Step 1: Set env vars in Vercel dashboard**

For each variable: Settings → Environment Variables → Add → paste value → select all environments → Save.

- [ ] **Step 2: Manually trigger a test ingestion**

```bash
curl -X POST https://clout-v-02.vercel.app/api/admin/ingest-social-posts \
  -H "x-admin-secret: $ADMIN_SECRET"
```

Expected response: `{"scraped":N,"inserted":N,"skipped":0,"errors":[]}`

- [ ] **Step 3: Verify posts appear in the Competitors tab**

Open the Signal Intelligence feed → Competitors tab. Confirm the "From their socials" section shows posts from configured competitor accounts.

- [ ] **Step 4: Final commit**

```bash
git add vercel.json
git commit -m "chore: add ingest-social-posts cron to vercel.json"
```
