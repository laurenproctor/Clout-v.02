# Competitor Intelligence Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified competitor intelligence feed that scrapes all content types (blog, YouTube, Twitter, LinkedIn, Instagram, Facebook) from competitor social accounts, enriches each item with AI-generated summaries and topics, scores by importance rather than recency, and caches globally so each competitor domain is scraped once regardless of how many workspaces track it.

**Architecture:** Scrapers per platform → normalize to `RawPost` → enrich via Claude Haiku (summary + topics) → score via `calculateImportanceScore` → upsert to `competitor_content_global` → create `workspace_competitor_content` mapping rows → unified `/api/competitors/content` read API joins global table + existing signal cards → single "Competitor Intelligence" section in SignalFeed sorted by `importance_score DESC`.

**Tech Stack:** Next.js App Router, Supabase (service client), Vitest, Anthropic SDK (`claude-haiku-4-5-20251001`), YouTube Data API v3, Twitter guest-token API, mbasic.facebook.com, LinkedIn Voyager API, Instagram private mobile API.

---

## File Map

**Create:**
- `lib/competitors/scrapers/types.ts` — shared `RawPost` interface + `urlParts` helper
- `lib/competitors/scrapers/blog.ts` — RSS/Atom feed scraper (extracted from existing posts route)
- `lib/competitors/scrapers/youtube.ts` — YouTube Data API v3
- `lib/competitors/scrapers/twitter.ts` — guest token + GraphQL
- `lib/competitors/scrapers/facebook.ts` — mbasic.facebook.com HTML
- `lib/competitors/scrapers/linkedin.ts` — Voyager API
- `lib/competitors/scrapers/instagram.ts` — private mobile API
- `lib/competitors/__tests__/scrapers.test.ts` — unit tests for pure parse functions
- `lib/competitors/__tests__/importance.test.ts` — unit tests for scoring
- `lib/competitors/calculate-importance.ts` — deterministic importance scorer
- `lib/competitors/enrich-content.ts` — Claude Haiku enrichment (summary + topics)
- `lib/competitors/ingest-competitor-content.ts` — global-dedup orchestrator
- `app/api/admin/ingest-competitor-content/route.ts` — cron + manual trigger
- `app/api/competitors/content/route.ts` — unified read endpoint
- `components/feed/CompetitorIntelligenceFeed.tsx` — unified UI feed component

**Modify:**
- `vercel.json` — add 6-hour cron
- `components/feed/SignalFeed.tsx` — replace three separate competitor sections with unified feed

**Superseded (stop calling, do not delete):**
- `app/api/competitors/posts/route.ts` — replaced by ingestion pipeline
- `app/api/competitors/signals/route.ts` — merged into `/api/competitors/content`

---

## Task 1: DB Migration

**Files:**
- Run SQL in Supabase SQL editor

- [ ] **Step 1: Run the migration**

```sql
-- Global content cache: each competitor domain scraped once, shared across workspaces
create table if not exists competitor_content_global (
  id                uuid primary key default gen_random_uuid(),
  competitor_domain text not null,
  source_type       text not null check (source_type in (
    'blog', 'youtube', 'twitter', 'linkedin', 'instagram', 'facebook'
  )),
  external_id       text not null,
  title             text,
  content           text,
  summary           text,
  url               text not null,
  thumbnail_url     text,
  published_at      timestamptz,
  fetched_at        timestamptz not null default now(),
  metrics           jsonb not null default '{}',
  topics            jsonb not null default '[]',
  importance_score  numeric not null default 0,
  source_confidence text not null default 'high' check (source_confidence in ('high', 'medium', 'low')),
  unique (competitor_domain, source_type, external_id)
);

create index if not exists competitor_content_global_domain_published
  on competitor_content_global (competitor_domain, published_at desc);

create index if not exists competitor_content_global_importance
  on competitor_content_global (importance_score desc);

-- Lightweight workspace → global content mapping
create table if not exists workspace_competitor_content (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_id   uuid not null references competitor_content_global(id) on delete cascade,
  primary key (workspace_id, content_id)
);

create index if not exists workspace_competitor_content_workspace
  on workspace_competitor_content (workspace_id);
```

- [ ] **Step 2: Verify**

In Supabase Table Editor confirm both tables exist. Insert one row into `competitor_content_global`, one row into `workspace_competitor_content` referencing it, then delete both. Confirm no FK errors.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: add competitor_content_global and workspace_competitor_content tables"
```

---

## Task 2: Shared Scraper Types

**Files:**
- Create: `lib/competitors/scrapers/types.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/competitors/scrapers/types.ts

/** Raw post returned by every scraper before enrichment. */
export interface RawPost {
  external_id:   string
  title?:        string
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
  maxPosts?: number   // default 10
}

/** Extract non-empty pathname segments from any URL string. */
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
git commit -m "feat: add shared scraper types"
```

---

## Task 3: Blog / RSS Scraper

**Files:**
- Create: `lib/competitors/scrapers/blog.ts`

Extracted from the existing `/api/competitors/posts/route.ts` — same parsing logic, now returns `RawPost[]` instead of `CompetitorPost[]`.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/blog.ts

import type { RawPost, ScraperOpts } from './types'

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function xmlText(xml: string, tag: string): string | null {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'))
  if (cdata) return cdata[1].trim()
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return plain ? plain[1].trim() : null
}

function atomLink(itemXml: string): string | null {
  const m = itemXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/)
  return m ? m[1] : null
}

function parseRss(xml: string): RawPost[] {
  const posts: RawPost[] = []

  // RSS 2.0
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const item    = m[1]
    const title   = xmlText(item, 'title')
    const link    = xmlText(item, 'link') ?? atomLink(item)
    const pubDate = xmlText(item, 'pubDate')
    const desc    = xmlText(item, 'description') ?? xmlText(item, 'summary')
    if (!title || !link) continue
    posts.push({
      external_id:  link,
      title:        stripHtml(title).slice(0, 200),
      content:      stripHtml(desc ?? '').slice(0, 500),
      url:          link,
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      metrics:      {},
    })
  }

  // Atom
  if (posts.length === 0) {
    const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    while ((m = entryRe.exec(xml)) !== null) {
      const entry     = m[1]
      const title     = xmlText(entry, 'title')
      const link      = atomLink(entry) ?? xmlText(entry, 'id')
      const published = xmlText(entry, 'published') ?? xmlText(entry, 'updated')
      const summary   = xmlText(entry, 'summary') ?? xmlText(entry, 'content')
      if (!title || !link) continue
      posts.push({
        external_id:  link,
        title:        stripHtml(title).slice(0, 200),
        content:      stripHtml(summary ?? '').slice(0, 500),
        url:          link,
        published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
        metrics:      {},
      })
    }
  }

  return posts
}

async function discoverRss(domain: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const buf  = await res.arrayBuffer()
    const html = new TextDecoder().decode(buf.slice(0, 100_000))

    const rssLink = html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss|atom)\+xml["']/i)
    if (rssLink) {
      const href = rssLink[1]
      return href.startsWith('http') ? href : `https://${domain}${href.startsWith('/') ? '' : '/'}${href}`
    }
  } catch { /* skip */ }

  for (const path of ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/blog/feed', '/blog/rss']) {
    try {
      const res = await fetch(`https://${domain}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
        signal: AbortSignal.timeout(3000),
        redirect: 'follow',
      })
      const ct = res.headers.get('content-type') ?? ''
      if (res.ok && (ct.includes('xml') || ct.includes('rss') || ct.includes('atom'))) {
        return `https://${domain}${path}`
      }
    } catch { /* try next */ }
  }
  return null
}

export async function scrapeBlog(
  domain: string,
  knownRssUrl: string | null | undefined,
  opts: ScraperOpts = {}
): Promise<RawPost[]> {
  const rssUrl = knownRssUrl ?? await discoverRss(domain)
  if (!rssUrl) return []

  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRss(xml).slice(0, opts.maxPosts ?? 10)
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/blog.ts
git commit -m "feat: add blog/RSS scraper (extracted from posts route)"
```

---

## Task 4: YouTube Scraper

**Files:**
- Create: `lib/competitors/scrapers/youtube.ts`

Requires `YOUTUBE_API_KEY`. Resolves channel URL → uploads playlist → video statistics.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/youtube.ts

import type { RawPost, ScraperOpts } from './types'
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
  return (await res.json())?.items?.[0]?.id ?? null
}

export async function scrapeYouTube(channelUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) { console.warn('[youtube] YOUTUBE_API_KEY not set'); return [] }

  const ref = parseChannelUrl(channelUrl)
  if (!ref) return []

  const channelId = await resolveChannelId(ref, apiKey)
  if (!channelId) return []

  const chanRes = await fetch(
    `${YT}/channels?${new URLSearchParams({ part: 'contentDetails', id: channelId, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!chanRes.ok) return []
  const uploadsId = (await chanRes.json())?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  const plRes = await fetch(
    `${YT}/playlistItems?${new URLSearchParams({
      part: 'snippet', playlistId: uploadsId,
      maxResults: String(opts.maxPosts ?? 10), key: apiKey,
    })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!plRes.ok) return []
  const items: Array<{
    snippet: {
      resourceId: { videoId: string }
      title: string
      publishedAt: string
      thumbnails: { medium?: { url: string }; default?: { url: string } }
    }
  }> = (await plRes.json())?.items ?? []
  if (!items.length) return []

  const videoIds = items.map(i => i.snippet.resourceId.videoId).join(',')
  const statsMap: Record<string, { viewCount?: string; likeCount?: string; commentCount?: string }> = {}
  const statsRes = await fetch(
    `${YT}/videos?${new URLSearchParams({ part: 'statistics', id: videoIds, key: apiKey })}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (statsRes.ok) {
    for (const v of (await statsRes.json())?.items ?? []) statsMap[v.id] = v.statistics
  }

  return items.map(item => {
    const videoId = item.snippet.resourceId.videoId
    const s = statsMap[videoId] ?? {}
    return {
      external_id:   videoId,
      title:         item.snippet.title,
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

## Task 5: Twitter Scraper

**Files:**
- Create: `lib/competitors/scrapers/twitter.ts`

Uses Twitter's internal guest API — no credentials needed. `GQL_*` hashes rotate periodically; find current values by opening twitter.com DevTools → Network → filter for `UserByScreenName` and copying the hash from the request path.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/twitter.ts

import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

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

## Task 6: Facebook Scraper

**Files:**
- Create: `lib/competitors/scrapers/facebook.ts`

`mbasic.facebook.com` returns server-rendered HTML — no JS required, no auth required for public Pages.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/facebook.ts

import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

function parsePageSlug(url: string): string | null {
  const parts = urlParts(url)
  const slug = parts[0]
  const blocked = new Set(['sharer', 'dialog', 'login', 'signup', 'photo', 'video', 'share', 'events', 'groups'])
  if (!slug || blocked.has(slug)) return null
  return slug
}

export function parseMbasicPosts(html: string): Array<{
  post_id: string; content: string; url: string; published_at: string; likes: number; comments: number
}> {
  const posts: Array<{ post_id: string; content: string; url: string; published_at: string; likes: number; comments: number }> = []
  const storyRe = /href="\/story\.php\?story_fbid=(\d+)(?:&amp;|&)id=(\d+)"[^>]*>(?:See|View) (?:full )?(?:story|post|more)<\/a>/gi
  const storyMatches = [...html.matchAll(storyRe)]
  if (!storyMatches.length) return posts

  const stories = storyMatches.map(m => ({ fbid: m[1], id: m[2], index: m.index ?? 0 }))

  for (let i = 0; i < stories.length; i++) {
    const { fbid, id, index } = stories[i]
    const end   = stories[i + 1]?.index ?? html.length
    const chunk = html.slice(Math.max(0, index - 3000), end)

    const textMatches = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    const content = textMatches
      .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim())
      .filter(t => t.length > 20)
      .join(' ')
      .slice(0, 500)
    if (!content) continue

    const abbrM = chunk.match(/<abbr[^>]*data-store="([^"]+)"/)
    const ms = abbrM ? (() => { try { return JSON.parse(decodeURIComponent(abbrM[1])).time * 1000 } catch { return null } })() : null
    const published_at = ms ? new Date(ms).toISOString() : new Date().toISOString()

    const likesM   = chunk.match(/(\d[\d,]*)\s*(?:people\s+)?(?:reacted|likes?)/i)
    const commentM = chunk.match(/(\d[\d,]*)\s*comments?/i)
    posts.push({
      post_id:      fbid,
      content,
      url:          `https://www.facebook.com/story.php?story_fbid=${fbid}&id=${id}`,
      published_at,
      likes:    likesM   ? parseInt(likesM[1].replace(/,/g, ''))   : 0,
      comments: commentM ? parseInt(commentM[1].replace(/,/g, '')) : 0,
    })
  }
  return posts
}

export async function scrapeFacebook(pageUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const slug = parsePageSlug(pageUrl)
  if (!slug) return []

  const res = await fetch(`https://mbasic.facebook.com/${slug}`, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:            'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []

  const html   = await res.text()
  const parsed = parseMbasicPosts(html)
  return parsed.slice(0, opts.maxPosts ?? 10).map(p => ({
    external_id:  p.post_id,
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

## Task 7: LinkedIn Scraper

**Files:**
- Create: `lib/competitors/scrapers/linkedin.ts`

Requires `LINKEDIN_LI_AT` env var. Makes one warm-up request to extract `JSESSIONID` for the CSRF token, then queries the Voyager API.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/linkedin.ts

import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

function parseCompanySlug(url: string): string | null {
  const parts = urlParts(url)
  return parts[0] === 'company' && parts[1] ? parts[1] : null
}

async function getCsrfToken(liAt: string): Promise<string> {
  try {
    const res = await fetch('https://www.linkedin.com/feed/', {
      headers: { Cookie: `li_at=${liAt}`, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      redirect: 'follow',
      signal:   AbortSignal.timeout(8000),
    })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const m = c.match(/JSESSIONID="?ajax:([^";]+)"?/)
      if (m) return `ajax:${m[1]}`
    }
  } catch { /* fall through */ }
  return 'ajax:0685672062'
}

function voyagerHeaders(liAt: string, csrf: string) {
  return {
    Cookie:                       `li_at=${liAt}; JSESSIONID="${csrf}"`,
    'csrf-token':                 csrf,
    'x-restli-protocol-version': '2.0.0',
    'x-li-lang':                 'en_US',
    'User-Agent':                 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    Accept:                       'application/vnd.linkedin.normalized+json+2.1',
  }
}

async function resolveCompanyId(slug: string, liAt: string, csrf: string): Promise<string | null> {
  const res = await fetch(
    `https://www.linkedin.com/voyager/api/organization/companies?q=universalName&universalName=${encodeURIComponent(slug)}`,
    { headers: voyagerHeaders(liAt, csrf), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  const d = await res.json()
  const entity = d?.elements?.[0] ?? d?.included?.[0]
  const urn: string = entity?.entityUrn ?? ''
  return urn.match(/urn:li:company:(\d+)/)?.[1] ?? null
}

interface VoyagerUpdate {
  updateContent?: { companyStatusUpdate?: { updateV2?: { text?: { text?: string }; media?: { thumbnail?: { url?: string } } } } }
  socialDetail?: { likes?: { paging?: { total?: number } }; comments?: { paging?: { total?: number } } }
  created?: { time?: number }
  permalink?: string
}

export async function scrapeLinkedIn(companyUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const liAt = process.env.LINKEDIN_LI_AT
  if (!liAt) { console.warn('[linkedin] LINKEDIN_LI_AT not set'); return [] }

  const slug = parseCompanySlug(companyUrl)
  if (!slug) return []

  const csrf      = await getCsrfToken(liAt)
  const companyId = await resolveCompanyId(slug, liAt, csrf)
  if (!companyId) { console.warn(`[linkedin] Could not resolve company ID for ${slug}`); return [] }

  const count = opts.maxPosts ?? 10
  const res = await fetch(
    `https://www.linkedin.com/voyager/api/feed/updatesV2?companyId=${companyId}&q=companyFeedByUniversalName&count=${count}&start=0`,
    { headers: voyagerHeaders(liAt, csrf), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) { console.warn(`[linkedin] Feed ${res.status} for ${slug}`); return [] }

  const updates: VoyagerUpdate[] = (await res.json())?.elements ?? []

  return updates.slice(0, count).map((u, i) => {
    const text = u.updateContent?.companyStatusUpdate?.updateV2?.text?.text ?? ''
    const time = u.created?.time
    return {
      external_id:   u.permalink ?? `${companyId}-${i}-${time ?? Date.now()}`,
      content:       text.slice(0, 500),
      url:           u.permalink ?? `https://www.linkedin.com/company/${slug}/posts/`,
      thumbnail_url: u.updateContent?.companyStatusUpdate?.updateV2?.media?.thumbnail?.url,
      published_at:  time ? new Date(time).toISOString() : new Date().toISOString(),
      metrics: {
        likes:    u.socialDetail?.likes?.paging?.total    ?? undefined,
        comments: u.socialDetail?.comments?.paging?.total ?? undefined,
      },
    }
  }).filter(p => p.content.length > 0)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/linkedin.ts
git commit -m "feat: add LinkedIn Voyager scraper"
```

---

## Task 8: Instagram Scraper

**Files:**
- Create: `lib/competitors/scrapers/instagram.ts`

Works for public accounts without auth. `INSTAGRAM_SESSION_ID` env var improves reliability.

- [ ] **Step 1: Create the scraper**

```typescript
// lib/competitors/scrapers/instagram.ts

import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

const IG_APP_ID = '936619743392459'
const IG_BASE   = 'https://i.instagram.com/api/v1'

function parseHandle(url: string): string | null {
  const parts = urlParts(url)
  const slug  = parts[0]
  const blocked = new Set(['p', 'explore', 'reel', 'reels', 'stories', 'tv', 'accounts', 'direct'])
  if (!slug || blocked.has(slug)) return null
  return slug.replace(/^@/, '')
}

function igHeaders(sessionId?: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent':  'Instagram 276.0.0.21.105 Android (30/11; 420dpi; 1080x2280; samsung; SM-G991B; o1s; exynos2100; en_US; 453743458)',
    'x-ig-app-id': IG_APP_ID,
    Accept:        '*/*',
  }
  if (sessionId) h.Cookie = `sessionid=${sessionId}`
  return h
}

async function resolveUserId(handle: string, sessionId?: string): Promise<string | null> {
  const res = await fetch(
    `${IG_BASE}/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    { headers: igHeaders(sessionId), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  return (await res.json())?.data?.user?.id ?? null
}

interface IGMedia {
  id: string
  caption?: { text?: string }
  timestamp: number
  like_count?: number
  comment_count?: number
  image_versions2?: { candidates?: Array<{ url: string }> }
  carousel_media?: Array<{ image_versions2?: { candidates?: Array<{ url: string }> } }>
  code?: string
}

export async function scrapeInstagram(profileUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const handle    = parseHandle(profileUrl)
  if (!handle) return []
  const sessionId = process.env.INSTAGRAM_SESSION_ID

  const userId = await resolveUserId(handle, sessionId)
  if (!userId) { console.warn(`[instagram] Could not resolve user ID for @${handle}`); return [] }

  const count = opts.maxPosts ?? 10
  const res   = await fetch(
    `${IG_BASE}/feed/user/${userId}/?count=${count}`,
    { headers: igHeaders(sessionId), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) { console.warn(`[instagram] Feed ${res.status} for @${handle}`); return [] }

  const items: IGMedia[] = (await res.json())?.items ?? []
  return items.slice(0, count).map(item => ({
    external_id:   item.id,
    content:       (item.caption?.text ?? '').slice(0, 500),
    url:           `https://www.instagram.com/p/${item.code ?? item.id}/`,
    thumbnail_url: item.image_versions2?.candidates?.[0]?.url ?? item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url,
    published_at:  new Date(item.timestamp * 1000).toISOString(),
    metrics: {
      likes:    item.like_count    ?? undefined,
      comments: item.comment_count ?? undefined,
    },
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/scrapers/instagram.ts
git commit -m "feat: add Instagram private API scraper"
```

---

## Task 9: Unit Tests

**Files:**
- Create: `lib/competitors/__tests__/scrapers.test.ts`
- Create: `lib/competitors/__tests__/importance.test.ts`

- [ ] **Step 1: Create scraper parse tests**

```typescript
// lib/competitors/__tests__/scrapers.test.ts

import { describe, it, expect } from 'vitest'
import { urlParts } from '../scrapers/types'
import { parseMbasicPosts } from '../scrapers/facebook'

describe('urlParts', () => {
  it('extracts path parts from full URL', () => {
    expect(urlParts('https://twitter.com/TechCrunch')).toEqual(['TechCrunch'])
  })

  it('works without protocol', () => {
    expect(urlParts('linkedin.com/company/stripe')).toEqual(['company', 'stripe'])
  })

  it('returns empty array for invalid URL', () => {
    expect(urlParts('not a url %%')).toEqual([])
  })

  it('filters empty segments', () => {
    expect(urlParts('https://youtube.com/@techcrunch')).toEqual(['@techcrunch'])
  })
})

describe('parseMbasicPosts', () => {
  it('returns empty array when no story permalinks exist', () => {
    expect(parseMbasicPosts('<html><body>nothing here</body></html>')).toEqual([])
  })

  it('extracts post_id and url from story permalink', () => {
    const html = `
      <p>Some post content that is definitely longer than twenty characters</p>
      <a href="/story.php?story_fbid=123456&amp;id=789">See full story</a>
    `
    const posts = parseMbasicPosts(html)
    expect(posts).toHaveLength(1)
    expect(posts[0].post_id).toBe('123456')
    expect(posts[0].url).toContain('story_fbid=123456')
  })

  it('parses reaction counts', () => {
    const html = `
      <p>Exciting announcement that is more than twenty characters long here</p>
      <span>42 people reacted</span>
      <a href="/story.php?story_fbid=999&amp;id=111">See full story</a>
      <span>7 comments</span>
    `
    const posts = parseMbasicPosts(html)
    expect(posts[0].likes).toBe(42)
    expect(posts[0].comments).toBe(7)
  })

  it('skips entries with no extractable text content', () => {
    const html = `<a href="/story.php?story_fbid=111&amp;id=222">See full story</a>`
    expect(parseMbasicPosts(html)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run scraper tests**

```bash
npx vitest run lib/competitors/__tests__/scrapers.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 3: Create importance scoring tests**

```typescript
// lib/competitors/__tests__/importance.test.ts

import { describe, it, expect } from 'vitest'
import { calculateImportanceScore } from '../calculate-importance'

describe('calculateImportanceScore', () => {
  it('returns a number between 0 and 100', () => {
    const score = calculateImportanceScore({
      published_at: new Date().toISOString(),
      metrics: { likes: 100, comments: 10 },
      content: 'A reasonable post with some content',
      source_type: 'linkedin',
      source_confidence: 'high',
      topics: ['AI', 'Marketing'],
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('scores fresh content higher than old content', () => {
    const base = {
      metrics: { likes: 0 }, content: 'test content here',
      source_type: 'twitter', source_confidence: 'high' as const, topics: [],
    }
    const fresh = calculateImportanceScore({ ...base, published_at: new Date().toISOString() })
    const old   = calculateImportanceScore({ ...base, published_at: new Date(Date.now() - 100 * 86_400_000).toISOString() })
    expect(fresh).toBeGreaterThan(old)
  })

  it('scores high-engagement content higher than zero-engagement content', () => {
    const base = {
      published_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      content: 'same content', source_type: 'linkedin',
      source_confidence: 'high' as const, topics: [],
    }
    const viral = calculateImportanceScore({ ...base, metrics: { likes: 5000, comments: 200, shares: 300 } })
    const zero  = calculateImportanceScore({ ...base, metrics: {} })
    expect(viral).toBeGreaterThan(zero)
  })

  it('returns 0 for minimal input', () => {
    const score = calculateImportanceScore({
      published_at: null, metrics: {}, content: '',
      source_type: 'twitter', source_confidence: 'low', topics: [],
    })
    expect(score).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 4: Run importance tests (will fail — importance module doesn't exist yet)**

```bash
npx vitest run lib/competitors/__tests__/importance.test.ts
```

Expected: FAIL with `Cannot find module '../calculate-importance'`. This confirms TDD setup is correct.

- [ ] **Step 5: Commit tests**

```bash
git add lib/competitors/__tests__/
git commit -m "test: add scraper parse and importance scoring unit tests"
```

---

## Task 10: Importance Scorer

**Files:**
- Create: `lib/competitors/calculate-importance.ts`

- [ ] **Step 1: Create the scorer**

```typescript
// lib/competitors/calculate-importance.ts

export interface ImportanceInput {
  published_at:      string | null
  metrics:           { likes?: number; comments?: number; shares?: number; views?: number }
  content:           string
  source_type:       string
  source_confidence: 'high' | 'medium' | 'low'
  topics:            string[]
}

export function calculateImportanceScore(input: ImportanceInput): number {
  const { published_at, metrics, content, source_type, source_confidence, topics } = input
  let score = 0

  // Recency (0–30 pts)
  if (published_at) {
    const ageDays = (Date.now() - new Date(published_at).getTime()) / 86_400_000
    if      (ageDays < 1)  score += 30
    else if (ageDays < 3)  score += 25
    else if (ageDays < 7)  score += 20
    else if (ageDays < 14) score += 12
    else if (ageDays < 30) score += 6
    // older than 30 days: no recency points
  }

  // Engagement (0–30 pts, logarithmic so outliers don't dominate)
  const { likes = 0, comments = 0, shares = 0, views = 0 } = metrics
  const engRaw = likes + comments * 2 + shares * 3 + views * 0.01
  score += Math.min(30, Math.round(Math.log10(engRaw + 1) * 10))

  // Content depth (0–10 pts)
  const words = content.split(/\s+/).filter(Boolean).length
  if      (words > 300) score += 10
  else if (words > 100) score += 7
  else if (words > 30)  score += 4
  else if (words > 0)   score += 1

  // Source confidence (0–10 pts)
  score += { high: 10, medium: 6, low: 2 }[source_confidence] ?? 5

  // Platform quality (0–7 pts)
  const platformBonus: Record<string, number> = {
    blog: 7, youtube: 6, linkedin: 5, news: 5, twitter: 3, instagram: 2, facebook: 2,
  }
  score += platformBonus[source_type] ?? 0

  // Topic richness (0–5 pts)
  score += Math.min(5, topics.length * 1.5)

  // No topic extraction yet = slight penalty (-2 pts)
  if (topics.length === 0) score = Math.max(0, score - 2)

  return Math.min(100, Math.round(score))
}
```

- [ ] **Step 2: Run the importance tests — they should now pass**

```bash
npx vitest run lib/competitors/__tests__/importance.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/competitors/calculate-importance.ts
git commit -m "feat: add deterministic importance scorer"
```

---

## Task 11: Content Enrichment

**Files:**
- Create: `lib/competitors/enrich-content.ts`

Calls Claude Haiku to generate a 2-sentence summary and extract up to 5 topics per content item. Fails gracefully — returns empty enrichment on error so ingestion continues.

- [ ] **Step 1: Create the enrichment module**

```typescript
// lib/competitors/enrich-content.ts

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export interface ContentEnrichment {
  summary: string
  topics:  string[]
}

export async function enrichContent(
  title: string | undefined,
  content: string,
  sourceType: string,
): Promise<ContentEnrichment> {
  const text = [title, content].filter(Boolean).join('\n').slice(0, 1200)
  if (!text.trim()) return { summary: '', topics: [] }

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role:    'user',
        content: `Analyze this ${sourceType} post from a competitor brand. Respond with JSON only — no explanation, no markdown fences.

Content:
${text}

Respond with exactly:
{"summary":"2 sentence summary of what this content is about and why it matters","topics":["Topic1","Topic2","Topic3"]}

Topics should be 1-3 words each, describing the main strategic themes (e.g. "Product Launch", "AI", "Creator Economy"). Max 5 topics.`,
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    // Strip any accidental markdown fences
    const json = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(json) as { summary?: string; topics?: unknown[] }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : '',
      topics:  Array.isArray(parsed.topics)
        ? parsed.topics.filter((t): t is string => typeof t === 'string').slice(0, 5)
        : [],
    }
  } catch (err) {
    console.warn('[enrich-content] Claude call failed:', err instanceof Error ? err.message : err)
    return { summary: '', topics: [] }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/enrich-content.ts
git commit -m "feat: add Claude Haiku content enrichment"
```

---

## Task 12: Ingestion Orchestrator

**Files:**
- Create: `lib/competitors/ingest-competitor-content.ts`

Deduplicates competitor domains across all workspaces — each domain scraped once per run. Enriches each post, calculates importance score, upserts to `competitor_content_global`, then creates `workspace_competitor_content` mappings for every workspace that tracks the domain.

- [ ] **Step 1: Create the orchestrator**

```typescript
// lib/competitors/ingest-competitor-content.ts

import { createServiceClient } from '@/lib/supabase/service'
import { scrapeBlog }      from './scrapers/blog'
import { scrapeYouTube }   from './scrapers/youtube'
import { scrapeTwitter }   from './scrapers/twitter'
import { scrapeFacebook }  from './scrapers/facebook'
import { scrapeLinkedIn }  from './scrapers/linkedin'
import { scrapeInstagram } from './scrapers/instagram'
import { enrichContent }   from './enrich-content'
import { calculateImportanceScore } from './calculate-importance'
import type { RawPost } from './scrapers/types'
import type { CompetitorMetadata } from '@/types/feed'

type SourceType = 'blog' | 'youtube' | 'twitter' | 'linkedin' | 'instagram' | 'facebook'

const SCRAPERS: Record<SourceType, (url: string) => Promise<RawPost[]>> = {
  blog:      () => Promise.resolve([]),  // blog uses domain + rss_url, handled specially below
  youtube:   url => scrapeYouTube(url),
  twitter:   url => scrapeTwitter(url),
  facebook:  url => scrapeFacebook(url),
  linkedin:  url => scrapeLinkedIn(url),
  instagram: url => scrapeInstagram(url),
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function sourceConfidence(sourceType: SourceType): 'high' | 'medium' | 'low' {
  return { blog: 'high', youtube: 'high', linkedin: 'medium', twitter: 'medium', instagram: 'low', facebook: 'low' }[sourceType] ?? 'medium'
}

export interface IngestResult {
  scraped:  number
  enriched: number
  inserted: number
  skipped:  number
  errors:   string[]
}

export async function ingestCompetitorContent(): Promise<IngestResult> {
  const supabase = createServiceClient()
  const result: IngestResult = { scraped: 0, enriched: 0, inserted: 0, skipped: 0, errors: [] }

  // Load all workspaces with competitor data
  const { data: rows, error } = await supabase
    .from('workspace_feed_settings')
    .select('workspace_id, competitors, competitor_metadata')
    .not('competitor_metadata', 'is', null)

  if (error) { result.errors.push(`Workspace fetch failed: ${error.message}`); return result }

  // Build global map: domain → { workspaceIds[], rss_url?, socials{} }
  const domainMap = new Map<string, {
    workspaceIds: string[]
    rssUrl:       string | null
    socials:      Partial<Record<SourceType, string>>
  }>()

  for (const row of rows ?? []) {
    const meta = (row.competitor_metadata ?? {}) as CompetitorMetadata
    for (const domain of (row.competitors ?? []) as string[]) {
      const entry = domainMap.get(domain) ?? { workspaceIds: [], rssUrl: null, socials: {} }
      if (!entry.workspaceIds.includes(row.workspace_id)) entry.workspaceIds.push(row.workspace_id)
      if (!entry.rssUrl && meta[domain]?.rss_url) entry.rssUrl = meta[domain].rss_url ?? null
      // Merge socials — first workspace to provide them wins
      const socials = (meta[domain]?.socials ?? {}) as Partial<Record<SourceType, string>>
      for (const [platform, url] of Object.entries(socials) as [SourceType, string][]) {
        if (url && !entry.socials[platform]) entry.socials[platform] = url
      }
      domainMap.set(domain, entry)
    }
  }

  // Cap total domains per run to stay within Vercel's 300s timeout
  const domains = [...domainMap.entries()].slice(0, 20)

  for (const [domain, { workspaceIds, rssUrl, socials }] of domains) {
    // Blog / RSS
    const blogPosts = await scrapeBlog(domain, rssUrl).catch(() => [])
    const socialPosts: Array<{ sourceType: SourceType; post: RawPost }> = blogPosts.map(p => ({ sourceType: 'blog', post: p }))

    // Social platforms
    for (const [sourceType, url] of Object.entries(socials) as [SourceType, string][]) {
      if (!url || sourceType === 'blog') continue
      await delay(1500)
      try {
        const posts = await SCRAPERS[sourceType](url)
        for (const post of posts) socialPosts.push({ sourceType, post })
      } catch (err) {
        result.errors.push(`Scrape failed [${sourceType}/${domain}]: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    result.scraped += socialPosts.length

    for (const { sourceType, post } of socialPosts) {
      // Enrich
      const enrichment = await enrichContent(post.title, post.content, sourceType)
      result.enriched++

      // Score
      const importance_score = calculateImportanceScore({
        published_at:      post.published_at,
        metrics:           post.metrics,
        content:           post.content,
        source_type:       sourceType,
        source_confidence: sourceConfidence(sourceType),
        topics:            enrichment.topics,
      })

      // Upsert to global cache
      const { data: globalRow, error: upsertErr } = await supabase
        .from('competitor_content_global')
        .upsert({
          competitor_domain: domain,
          source_type:       sourceType,
          external_id:       post.external_id,
          title:             post.title ?? null,
          content:           post.content,
          summary:           enrichment.summary || null,
          url:               post.url,
          thumbnail_url:     post.thumbnail_url ?? null,
          published_at:      post.published_at,
          fetched_at:        new Date().toISOString(),
          metrics:           post.metrics,
          topics:            enrichment.topics,
          importance_score,
          source_confidence: sourceConfidence(sourceType),
        }, { onConflict: 'competitor_domain,source_type,external_id' })
        .select('id')
        .single()

      if (upsertErr || !globalRow) {
        result.errors.push(`Global upsert failed [${sourceType}/${domain}/${post.external_id}]: ${upsertErr?.message}`)
        continue
      }

      result.inserted++

      // Create workspace mappings
      const mappings = workspaceIds.map(workspace_id => ({ workspace_id, content_id: globalRow.id }))
      await supabase
        .from('workspace_competitor_content')
        .upsert(mappings, { onConflict: 'workspace_id,content_id', ignoreDuplicates: true })
    }
  }

  return result
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/competitors/ingest-competitor-content.ts
git commit -m "feat: add global-dedup competitor content ingestion orchestrator"
```

---

## Task 13: Cron API Route + vercel.json

**Files:**
- Create: `app/api/admin/ingest-competitor-content/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the API route**

```typescript
// app/api/admin/ingest-competitor-content/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { ingestCompetitorContent } from '@/lib/competitors/ingest-competitor-content'

function isAuthorized(req: NextRequest): boolean {
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET
    return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
  }
  const secret = process.env.ADMIN_SECRET
  return !!secret && req.headers.get('x-admin-secret') === secret
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await ingestCompetitorContent())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await ingestCompetitorContent())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Update vercel.json**

Replace the contents of `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/ingest-signals",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/admin/ingest-competitor-content",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ingest-competitor-content/route.ts vercel.json
git commit -m "feat: add ingest-competitor-content cron route"
```

---

## Task 14: Unified Read API

**Files:**
- Create: `app/api/competitors/content/route.ts`

Joins `competitor_content_global` via `workspace_competitor_content` mappings. Also fetches competitor news signal cards (from the existing `signal_cards` table) and normalises them into the same shape. Returns a single list sorted by `importance_score DESC, published_at DESC`.

- [ ] **Step 1: Create the route**

```typescript
// app/api/competitors/content/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export interface CompetitorContentItem {
  id:                string
  competitor_domain: string
  source_type:       string
  title:             string | null
  content:           string
  summary:           string | null
  url:               string
  thumbnail_url:     string | null
  published_at:      string | null
  metrics:           { likes?: number; comments?: number; shares?: number; views?: number }
  topics:            string[]
  importance_score:  number
  source_confidence: string
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const source_type = req.nextUrl.searchParams.get('source_type')

  const supabase = await createClient()

  // 1. Scraped content (blog + social) from global cache
  let contentQuery = supabase
    .from('workspace_competitor_content')
    .select(`
      content_id,
      competitor_content_global (
        id, competitor_domain, source_type, title, content, summary,
        url, thumbnail_url, published_at, metrics, topics, importance_score, source_confidence
      )
    `)
    .eq('workspace_id', session.workspaceId)

  const { data: mappingRows } = await contentQuery
  const scrapedItems: CompetitorContentItem[] = (mappingRows ?? [])
    .map(r => {
      const g = Array.isArray(r.competitor_content_global)
        ? r.competitor_content_global[0]
        : r.competitor_content_global
      if (!g) return null
      return {
        id:                g.id,
        competitor_domain: g.competitor_domain,
        source_type:       g.source_type,
        title:             g.title,
        content:           g.content,
        summary:           g.summary,
        url:               g.url,
        thumbnail_url:     g.thumbnail_url,
        published_at:      g.published_at,
        metrics:           (g.metrics as CompetitorContentItem['metrics']) ?? {},
        topics:            (g.topics as string[]) ?? [],
        importance_score:  g.importance_score ?? 0,
        source_confidence: g.source_confidence ?? 'high',
      } satisfies CompetitorContentItem
    })
    .filter((x): x is CompetitorContentItem => x !== null)

  // 2. News signal cards for this workspace's competitors
  const { data: competitorEntities } = await supabase
    .from('competitor_entities')
    .select('id, domain')
    .eq('workspace_id', session.workspaceId)

  const competitorEntityIds = (competitorEntities ?? []).map(e => e.id)
  const entityDomainMap = Object.fromEntries((competitorEntities ?? []).map(e => [e.id, e.domain ?? '']))

  let newsItems: CompetitorContentItem[] = []
  if (competitorEntityIds.length > 0) {
    const { data: signalCards } = await supabase
      .from('signal_cards')
      .select('id, title, competitor_id, gdelt_score, created_at, momentum_bar_width')
      .eq('tab', 'competitors')
      .in('competitor_id', competitorEntityIds)
      .order('gdelt_score', { ascending: false })
      .limit(20)

    newsItems = (signalCards ?? []).map(card => {
      const domain = entityDomainMap[card.competitor_id ?? ''] ?? ''
      const gdeltScore = card.gdelt_score ?? 0
      const velocity   = card.momentum_bar_width ?? 0
      return {
        id:                card.id,
        competitor_domain: domain,
        source_type:       'news',
        title:             card.title,
        content:           card.title ?? '',
        summary:           null,
        url:               '',
        thumbnail_url:     null,
        published_at:      card.created_at,
        metrics:           {},
        topics:            [],
        importance_score:  Math.min(100, Math.round(gdeltScore * 10 + velocity * 0.2)),
        source_confidence: 'high',
      } satisfies CompetitorContentItem
    })
  }

  // 3. Merge, filter by source_type if requested, sort
  let combined = [...scrapedItems, ...newsItems]
  if (source_type) combined = combined.filter(i => i.source_type === source_type)

  combined.sort((a, b) => {
    if (b.importance_score !== a.importance_score) return b.importance_score - a.importance_score
    return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  })

  return NextResponse.json({ items: combined.slice(0, 60) })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/competitors/content/route.ts
git commit -m "feat: add unified competitor content read API"
```

---

## Task 15: CompetitorIntelligenceFeed Component

**Files:**
- Create: `components/feed/CompetitorIntelligenceFeed.tsx`

Single component rendering all competitor content as cards sorted by importance, with source-type badges.

- [ ] **Step 1: Create the component**

```tsx
// components/feed/CompetitorIntelligenceFeed.tsx

'use client'

import { tokens } from '@/lib/feed/tokens'
import type { CompetitorContentItem } from '@/app/api/competitors/content/route'

const SOURCE_LABEL: Record<string, string> = {
  blog:      'Blog',
  youtube:   'YouTube',
  twitter:   'X / Twitter',
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  news:      'News',
}

const SOURCE_COLOR: Record<string, string> = {
  blog:      '#374151',
  youtube:   '#FF0000',
  twitter:   '#000000',
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
  facebook:  '#1877F2',
  news:      '#059669',
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const color = SOURCE_COLOR[sourceType] ?? '#6b7280'
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
      backgroundColor: `${color}15`,
      color,
      border:          `1px solid ${color}30`,
    }}>
      {SOURCE_LABEL[sourceType] ?? sourceType}
    </span>
  )
}

function ImportanceDot({ score }: { score: number }) {
  const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#9ca3af'
  return (
    <span
      title={`Importance: ${score}`}
      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
    />
  )
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ContentCard({ item, index }: { item: CompetitorContentItem; index: number }) {
  const m = item.metrics ?? {}
  const metricParts: string[] = []
  if (m.likes    != null) metricParts.push(`${fmt(m.likes)} likes`)
  if (m.comments != null) metricParts.push(`${fmt(m.comments)} comments`)
  if (m.shares   != null) metricParts.push(`${fmt(m.shares)} shares`)
  if (m.views    != null) metricParts.push(`${fmt(m.views)} views`)

  const displayText = item.summary || item.content || item.title || ''

  return (
    <div style={{
      border:          `1px solid ${tokens.colors.cardBorder ?? '#e5e7eb'}`,
      borderRadius:    '8px',
      backgroundColor: '#fff',
      marginBottom:    '12px',
      overflow:        'hidden',
      animation:       'feedCardEnter 0.35s ease both',
      animationDelay:  `${index * 50}ms`,
    }}>
      {item.thumbnail_url && item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail_url}
            alt=""
            style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
          />
        </a>
      )}

      <div style={{ padding: '12px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${item.competitor_domain}&sz=16`}
            width={14} height={14} alt=""
            style={{ borderRadius: '2px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {item.competitor_domain}
          </span>
          <SourceBadge sourceType={item.source_type} />
          <ImportanceDot score={item.importance_score} />
          {item.published_at && (
            <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>
              {relativeTime(item.published_at)}
            </span>
          )}
        </div>

        {/* Title */}
        {item.title && (
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 4px', lineHeight: 1.4 }}>
            {item.title.slice(0, 120)}
          </p>
        )}

        {/* Summary / content */}
        {displayText && (
          <p style={{
            fontSize: '12px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {displayText}
          </p>
        )}

        {/* Topics */}
        {item.topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            {item.topics.map(t => (
              <span key={t} style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          {metricParts.length > 0 && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {metricParts.join(' · ')}
            </span>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none', marginLeft: 'auto' }}
            >
              View →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  items:   CompetitorContentItem[]
  loading: boolean
  error:   string | null
  onRetry: () => void
}

export function CompetitorIntelligenceFeed({ items, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: '#9ca3af', fontSize: '14px' }}>
        Loading competitor intelligence…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        <button
          onClick={onRetry}
          style={{ padding: '7px 16px', fontSize: '13px', backgroundColor: '#1a1560', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>
          No competitor content yet. Add competitors in{' '}
          <a href="../settings/feed" style={{ color: '#4f46e5', textDecoration: 'none' }}>Signal Feed settings</a>
          {' '}— content will appear after the next sync.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9ca3af' }}>
          Competitor Intelligence · {items.length} items
        </span>
      </div>
      {items.map((item, index) => (
        <ContentCard key={item.id} item={item} index={index} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/feed/CompetitorIntelligenceFeed.tsx
git commit -m "feat: add CompetitorIntelligenceFeed unified UI component"
```

---

## Task 16: SignalFeed Integration

**Files:**
- Modify: `components/feed/SignalFeed.tsx`

Replace the three existing competitor sections ("From their channels", "From their socials", "Signal tracking") with a single `CompetitorIntelligenceFeed`. Four targeted edits.

- [ ] **Step 1: Add import**

At the top of `SignalFeed.tsx`, replace the three competitor component imports:

```tsx
// Remove these three lines:
import { CompetitorCard } from './CompetitorCard'
import { CompetitorPostCard } from './CompetitorPostCard'
// (CompetitorSocialPostCard does not exist yet — this is the first integration)

// Add:
import { CompetitorIntelligenceFeed } from './CompetitorIntelligenceFeed'
import type { CompetitorContentItem } from '@/app/api/competitors/content/route'
```

- [ ] **Step 2: Replace competitor state**

Remove these state declarations:

```tsx
// Remove:
const [competitorCache, setCompetitorCache] = useState<CompetitorCache>(null)
const [competitorPostCache, setCompetitorPostCache] = useState<CompetitorPostCache>(null)
```

Add in their place:

```tsx
const [competitorItems, setCompetitorItems] = useState<CompetitorContentItem[] | null>(null)
```

- [ ] **Step 3: Replace the competitor fetch branch**

In `fetchTab`, find the `if (tab === 'competitors')` branch. Replace its entire body:

```tsx
if (tab === 'competitors') {
  const res = await fetch('/api/competitors/content')
  if (!res.ok) throw new Error('Failed to load competitive intelligence')
  const { items } = await res.json()
  setCompetitorItems(items ?? [])
}
```

- [ ] **Step 4: Update `handleTabChange` cache check**

Find:
```tsx
const alreadyCached = tab === 'competitors'
  ? competitorCache !== null
  : cardCache[tab] !== undefined
```

Replace with:
```tsx
const alreadyCached = tab === 'competitors'
  ? competitorItems !== null
  : cardCache[tab] !== undefined
```

- [ ] **Step 5: Update `isEmpty`**

Find the `isEmpty` computation. Replace the competitors case:

```tsx
const isEmpty = activeTab === 'competitors'
  ? !competitorItems || competitorItems.length === 0
  : !activeCards || activeCards.length === 0
```

- [ ] **Step 6: Replace the three competitor render sections**

Remove these three blocks from the render:
- The "From their channels" section (blog posts)
- The "Signal tracking" section (competitor signal cards)
- Any social post section if partially present

Replace all three with:

```tsx
{activeTab === 'competitors' && (
  <CompetitorIntelligenceFeed
    items={competitorItems ?? []}
    loading={loading}
    error={error}
    onRetry={() => fetchTab('competitors')}
  />
)}
```

Note: this renders even while loading/error because `CompetitorIntelligenceFeed` handles those states internally. Remove the generic `{loading && ...}` and `{!loading && error && ...}` blocks when the competitors tab is active, or wrap them: only show the generic blocks for non-competitor tabs.

- [ ] **Step 7: Run dev server and verify**

```bash
npm run dev
```

Open Signal Intelligence → Competitors tab. Confirm:
- Single "Competitor Intelligence" section renders
- Source-type badges (Blog, YouTube, etc.) appear
- Importance dot indicator shows
- Existing tabs (News, Services, Concepts) still render correctly
- No TypeScript errors in terminal

- [ ] **Step 8: Commit**

```bash
git add components/feed/SignalFeed.tsx
git commit -m "feat: wire unified CompetitorIntelligenceFeed into SignalFeed"
```

---

## Task 17: Environment Variables + First Run

- [ ] **Step 1: Set env vars in Vercel**

Settings → Environment Variables → Add, for all environments:

| Variable | How to get it |
|---|---|
| `YOUTUBE_API_KEY` | Google Cloud Console → APIs & Services → Credentials → Create API key → restrict to YouTube Data API v3 |
| `LINKEDIN_LI_AT` | Log into linkedin.com → DevTools → Application → Cookies → copy `li_at` value |
| `INSTAGRAM_SESSION_ID` | Log into instagram.com → DevTools → Application → Cookies → copy `sessionid` value |

`CRON_SECRET`, `ADMIN_SECRET`, `ANTHROPIC_API_KEY` — already set.

- [ ] **Step 2: Trigger first ingestion manually**

```bash
curl -X POST https://clout-v-02.vercel.app/api/admin/ingest-competitor-content \
  -H "x-admin-secret: $ADMIN_SECRET"
```

Expected: `{"scraped":N,"enriched":N,"inserted":N,"skipped":0,"errors":[]}`

- [ ] **Step 3: Verify posts appear**

Open Signal Intelligence → Competitors tab. Confirm items appear sorted by importance score (green/amber/grey dot on each card).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: competitor intelligence feed complete"
```
